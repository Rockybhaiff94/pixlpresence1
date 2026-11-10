import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { prisma } from '@discord-rpc/database';
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

function cleanEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  return trimmed || fallback;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim().replace(/^["']|["']$/g, '');
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const DISCORD_CLIENT_ID = cleanEnv(process.env.DISCORD_CLIENT_ID, '');
const DISCORD_CLIENT_SECRET = cleanEnv(process.env.DISCORD_CLIENT_SECRET, '');
const DISCORD_CALLBACK_URL = cleanEnv(
  process.env.DISCORD_CALLBACK_URL,
  process.env.NODE_ENV === 'production'
    ? 'https://pixelgg-api.onrender.com/auth/discord/callback'
    : 'http://localhost:3001/auth/discord/callback'
);
const FRONTEND_URL = cleanEnv(
  process.env.FRONTEND_URL,
  process.env.NODE_ENV === 'production'
    ? 'https://pixlpresence1-web.vercel.app'
    : 'http://localhost:3000'
);

const scopes = ['identify', 'email'];

export function resolveDiscordAvatarUrl(discordId: string | null | undefined, avatar: string | null | undefined): string {
  if (!avatar || avatar.trim().length === 0) {
    if (!discordId) return 'https://cdn.discordapp.com/embed/avatars/0.png';
    try {
      const idx = Number((BigInt(discordId) >> BigInt(22)) % BigInt(6));
      return `https://cdn.discordapp.com/embed/avatars/${Math.abs(idx)}.png`;
    } catch (_) {
      return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
  }

  // Already an absolute HTTP/HTTPS URL
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }

  // Discord 32-character hex avatar hash (e.g. "a_..." or "1a2b...")
  const isAnimated = avatar.startsWith('a_');
  const ext = isAnimated ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=256`;
}

if (DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET) {
  passport.use(
    new DiscordStrategy(
      {
        clientID: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
        callbackURL: DISCORD_CALLBACK_URL,
        scope: scopes,
      },
      async (accessToken, refreshToken, profile, done) => {
      try {
        console.log(`[Discord OAuth] Processing login for Discord ID: ${profile.id} (${profile.username})`);
        const adminIds = cleanEnv(process.env.ADMIN_DISCORD_IDS, '704548873145942076')
          .split(',')
          .map((id) => id.trim());
        const isAdmin = adminIds.includes(profile.id);

        const email = profile.email || null;
        const globalName = profile.global_name || null;
        const rawAvatar = profile.avatar || null;
        const avatar = resolveDiscordAvatarUrl(profile.id, rawAvatar);
        const banner = profile.banner || null;
        const nitroStatus = Number(profile.premium_type) || 0;

        let user;
        try {
          user = await prisma.user.upsert({
            where: { discordId: profile.id },
            update: {
              username: profile.username,
              globalName,
              avatar,
              banner,
              email,
              nitroStatus,
            },
            create: {
              discordId: profile.id,
              username: profile.username,
              globalName,
              avatar,
              banner,
              email,
              nitroStatus,
              role: isAdmin ? 'ADMIN' : 'USER',
              appToken: crypto.randomBytes(32).toString('hex'),
            },
          });
        } catch (dbErr: any) {
          // If a unique constraint failed (e.g. username collision), safely resolve
          if (dbErr?.code === 'P2002') {
            console.warn('[Discord OAuth] Unique constraint collision encountered, resolving with unique username fallback');
            user = await prisma.user.upsert({
              where: { discordId: profile.id },
              update: {
                globalName,
                avatar,
                banner,
                nitroStatus,
              },
              create: {
                discordId: profile.id,
                username: `${profile.username}_${profile.id.slice(-4)}`,
                globalName,
                avatar,
                banner,
                email: null,
                nitroStatus,
                role: isAdmin ? 'ADMIN' : 'USER',
                appToken: crypto.randomBytes(32).toString('hex'),
              },
            });
          } else {
            throw dbErr;
          }
        }

        // Ensure user has a persistent appToken for cross-domain Bearer auth
        if (!user.appToken) {
          const generatedToken = crypto.randomBytes(32).toString('hex');
          user = await prisma.user.update({
            where: { id: user.id },
            data: { appToken: generatedToken },
          });
          console.log(`[Discord OAuth] Generated new appToken for user: ${user.username}`);
        }

        // Ensure user profile exists and syncs latest avatar / display name
        await prisma.profile.upsert({
          where: { userId: user.id },
          update: {
            displayName: globalName || profile.username,
            avatarUrl: avatar,
          },
          create: {
            userId: user.id,
            displayName: globalName || profile.username,
            avatarUrl: avatar,
          },
        });

        // Record or sync canonical Discord identity
        try {
          await prisma.userIdentity.upsert({
            where: {
              provider_providerUserId: {
                provider: 'discord',
                providerUserId: profile.id,
              },
            },
            update: {
              email,
              displayName: globalName || profile.username,
              avatarUrl: avatar,
            },
            create: {
              userId: user.id,
              provider: 'discord',
              providerUserId: profile.id,
              email,
              displayName: globalName || profile.username,
              avatarUrl: avatar,
            },
          });
        } catch (identErr) {
          console.warn('[Discord Identity Sync Warning]:', identErr);
        }

        console.log(`[Discord OAuth] Successfully authenticated: ${user.username} (${user.id})`);
        return done(null, user);
      } catch (err) {
        console.error('[Discord OAuth Verify Error]:', err);
        return done(err as Error, undefined);
      }
    }
  )
);
} else {
  console.warn('[Discord OAuth] DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not configured.');
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        identities: true,
      },
    });
    if (user) {
      user.avatar = resolveDiscordAvatarUrl(user.discordId, user.avatar);
      if (user.profile) {
        user.profile.avatarUrl = resolveDiscordAvatarUrl(user.discordId, user.profile.avatarUrl || user.avatar);
      }
    }
    done(null, user);
  } catch (err) {
    console.error('[Discord OAuth Deserialize Error]:', err);
    done(err, null);
  }
});

export const authRouter = Router();

// Diagnostic endpoint to verify OAuth and Database configuration
authRouter.get('/discord/status', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }

  const mask = (s: string) => (s && s.length > 8 ? `${s.slice(0, 4)}...${s.slice(-4)}` : '***');

  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    clientId: DISCORD_CLIENT_ID,
    clientSecretConfigured: Boolean(DISCORD_CLIENT_SECRET),
    clientSecretMasked: mask(DISCORD_CLIENT_SECRET),
    callbackUrl: DISCORD_CALLBACK_URL,
    frontendUrl: FRONTEND_URL,
    database: dbStatus,
  });
});

authRouter.get('/discord', (req, res, next) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return res.status(503).json({ error: 'Discord OAuth is not configured on this server.' });
  }
  passport.authenticate('discord')(req, res, next);
});

authRouter.get('/discord/callback', (req, res, next) => {
  passport.authenticate('discord', async (err: any, user: any, info: any) => {
    if (err) {
      console.error('[Discord OAuth Callback Failure]:', err);
      const errMsg =
        err?.message ||
        err?.error_description ||
        (typeof err === 'string' ? err : 'Authentication failed with provider');

      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Notice</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
            h1 { color: #f43f5e; font-size: 22px; margin-bottom: 12px; font-weight: 700; }
            p { color: #a1a1aa; font-size: 14px; line-height: 1.5; margin-bottom: 20px; word-break: break-word; }
            .code { background: #09090b; border: 1px solid #27272a; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #fb7185; text-align: left; margin-bottom: 24px; overflow-x: auto; }
            .btn { display: inline-block; background: #9333ea; color: white; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; transition: background 0.2s; }
            .btn:hover { background: #a855f7; }
          </style>
          <script>
            setTimeout(function() {
              window.location.href = "${FRONTEND_URL}/?error=" + encodeURIComponent(${JSON.stringify(errMsg)});
            }, 3500);
          </script>
        </head>
        <body>
          <div class="card">
            <h1>Authentication Notice</h1>
            <p>We could not complete your Discord login session. You will be redirected shortly.</p>
            <div class="code">${errMsg}</div>
            <a href="${FRONTEND_URL}" class="btn">Return to Homepage</a>
          </div>
        </body>
        </html>
      `);
    }

    if (!user) {
      console.warn('[Discord OAuth Callback]: No user returned from strategy', info);
      const msg = info?.message || 'Authentication declined';
      return res.redirect(`${FRONTEND_URL}/?error=${encodeURIComponent(msg)}`);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('[Discord OAuth req.logIn Error]:', loginErr);
        return res.redirect(
          `${FRONTEND_URL}/?error=${encodeURIComponent(loginErr.message || 'Session login failed')}`
        );
      }
      console.log(`[Discord OAuth] User ${user.username} logged in successfully.`);
      
      // Explicitly set userId in session object
      (req.session as any).userId = user.id;

      // CRITICAL: Wait for session persistence to complete before issuing 302 redirect
      req.session.save(async (saveErr) => {
        if (saveErr) {
          console.error('[Session Save Warning]:', saveErr);
        } else {
          try {
            if (req.sessionID) {
              await prisma.session.updateMany({
                where: { sid: req.sessionID },
                data: { userId: user.id },
              });
            }
          } catch (dbErr) {
            console.warn('[Session.userId sync warning]:', dbErr);
          }
        }

        const token = user.appToken || '';
        try {
          if (token) {
            res.cookie('pixel_app_token', token, {
              maxAge: 30 * 24 * 60 * 60 * 1000,
              sameSite: 'none',
              secure: true,
              path: '/',
            });
          }
        } catch (cErr) {
          console.warn('[Cookie set warning]:', cErr);
        }

        // Pass token in URL parameter so cross-domain environments can authenticate without 3rd party cookies
        const redirectUrl = token
          ? `${FRONTEND_URL}/account?token=${encodeURIComponent(token)}`
          : `${FRONTEND_URL}/account`;
        return res.redirect(redirectUrl);
      });
    });
  })(req, res, next);
});

// Google OAuth stub / bridge
authRouter.get('/google', (req, res) => {
  // If Google OAuth credentials are not yet configured in production environment
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google OAuth is not configured yet. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.')}`);
  }
  // If configured, forward
  res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent('Google OAuth initialization in progress.')}`);
});

const handleLogout = (req: any, res: any) => {
  req.logout((err: any) => {
    if (req.session) {
      req.session.destroy(() => {});
    }
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('connect.sid', {
      path: '/',
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    res.clearCookie('pixel_app_token', {
      path: '/',
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    return res.json({ success: true, message: 'Logged out successfully' });
  });
};

authRouter.get('/logout', handleLogout);
authRouter.post('/logout', handleLogout);

// Get Current Authenticated User & Profile
authRouter.get('/me', async (req: any, res) => {
  try {
    let user = req.user;

    // Support Bearer token header or cookie
    if (!user) {
      let token: string | null = null;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1]?.trim();
      } else if (req.headers.cookie) {
        const match = req.headers.cookie.match(/(?:^|;\s*)pixel_app_token=([^;]+)/);
        if (match && match[1]) {
          token = decodeURIComponent(match[1]).trim();
        }
      }

      if (token) {
        user = await prisma.user.findFirst({
          where: { appToken: token },
          include: {
            profile: {
              include: { links: true, buttons: true },
            },
            identities: true,
          },
        });
      }
    }

    if (user && !user.profile) {
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          profile: {
            include: { links: true, buttons: true },
          },
          identities: true,
        },
      });
    }

    if (user) {
      if (!user.appToken) {
        const generatedToken = crypto.randomBytes(32).toString('hex');
        user = await prisma.user.update({
          where: { id: user.id },
          data: { appToken: generatedToken },
          include: {
            profile: {
              include: { links: true, buttons: true },
            },
            identities: true,
          },
        });
      }
      user.avatar = resolveDiscordAvatarUrl(user.discordId, user.avatar);
      if (user.profile) {
        user.profile.avatarUrl = resolveDiscordAvatarUrl(user.discordId, user.profile.avatarUrl || user.avatar);
      }

      // Security: Never leak password hash to client
      const { passwordHash, ...safeUser } = user;
      return res.json(safeUser);
    }

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reserved usernames that cannot be claimed
const RESERVED_USERNAMES = new Set([
  'admin', 'api', 'auth', 'dashboard', 'account', 'settings',
  'login', 'register', 'logout', 'explore', 'rpc', 'terms', 'privacy',
  'help', 'support', 'null', 'undefined', 'system', 'root', 'bot',
  'pixel', 'pixelgg', 'status', 'pricing', 'compare', 'leaderboard'
]);

// Email & Password Registration
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, username, displayName } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = String(username).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 24) {
      return res.status(400).json({ error: 'Username must be between 3 and 24 characters.' });
    }

    if (RESERVED_USERNAMES.has(cleanUsername)) {
      return res.status(400).json({ error: 'This username is reserved. Please choose another.' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check existing email or username
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { username: cleanUsername },
        ],
      },
    });

    if (existing) {
      if (existing.email === cleanEmail) {
        return res.status(400).json({ error: 'An account with this email address already exists.' });
      }
      return res.status(400).json({ error: 'This username is already taken. Please choose another.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const appToken = crypto.randomBytes(32).toString('hex');

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        globalName: displayName || cleanUsername,
        passwordHash,
        appToken,
        role: 'USER',
        profile: {
          create: {
            displayName: displayName || cleanUsername,
            bio: '',
            views: 0,
          },
        },
        identities: {
          create: {
            provider: 'local',
            providerUserId: cleanEmail,
            email: cleanEmail,
            displayName: displayName || cleanUsername,
          },
        },
      },
      include: {
        profile: true,
        identities: true,
      },
    });

    // Automatically establish server session
    req.logIn(newUser, (loginErr) => {
      if (loginErr) {
        console.error('[Register req.logIn error]:', loginErr);
      }

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('pixel_app_token', appToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
      });

      const { passwordHash, ...safeUser } = newUser as any;
      return res.status(201).json({
        user: safeUser,
        token: appToken,
        message: 'Account created successfully',
      });
    });
  } catch (err: any) {
    console.error('[Register Error]:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Email or Username & Password Login
authRouter.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Please enter your username/email and password.' });
    }

    const cleanInput = String(emailOrUsername).trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanInput },
          { username: cleanInput },
        ],
      },
      include: {
        profile: true,
        identities: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials or account registered via Discord OAuth.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials. Please verify your password.' });
    }

    // Ensure user has an appToken
    let activeToken = user.appToken;
    if (!activeToken) {
      activeToken = crypto.randomBytes(32).toString('hex');
      await prisma.user.update({
        where: { id: user.id },
        data: { appToken: activeToken },
      });
    }

    // Regenerate / establish authenticated session
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('[Login req.logIn error]:', loginErr);
      }

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('pixel_app_token', activeToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: false,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
      });

      const { passwordHash, ...safeUser } = user as any;
      return res.json({
        user: safeUser,
        token: activeToken,
        message: 'Signed in successfully',
      });
    });
  } catch (err: any) {
    console.error('[Login Error]:', err);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Get User Connections
authRouter.get('/connections', async (req: any, res) => {
  try {
    const authHeader = req.headers.authorization;
    let user = req.user;

    if (!user && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]?.trim();
      if (token) {
        user = await prisma.user.findFirst({
          where: { appToken: token },
          include: { identities: true },
        });
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const identities = await prisma.userIdentity.findMany({
      where: { userId: user.id },
    });

    const discordIdent = identities.find((i) => i.provider === 'discord') || (user.discordId ? {
      provider: 'discord',
      providerUserId: user.discordId,
      displayName: user.globalName || user.username,
      avatarUrl: user.avatar,
    } : null);

    const googleIdent = identities.find((i) => i.provider === 'google');
    const localIdent = identities.find((i) => i.provider === 'local') || (user.passwordHash ? {
      provider: 'local',
      providerUserId: user.email,
      email: user.email,
    } : null);

    return res.json({
      discord: {
        connected: Boolean(discordIdent),
        id: discordIdent?.providerUserId || null,
        displayName: discordIdent?.displayName || null,
      },
      google: {
        connected: Boolean(googleIdent),
        id: googleIdent?.providerUserId || null,
        displayName: googleIdent?.displayName || null,
      },
      email: {
        connected: Boolean(localIdent),
        email: user.email || null,
        hasPassword: Boolean(user.passwordHash),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve connections' });
  }
});

// Safe Disconnection / Unlinking
authRouter.post('/connections/unlink', async (req: any, res) => {
  try {
    const { provider } = req.body;
    const authHeader = req.headers.authorization;
    let user = req.user;

    if (!user && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]?.trim();
      if (token) {
        user = await prisma.user.findFirst({
          where: { appToken: token },
          include: { identities: true },
        });
      }
    }

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Count available authentication methods
    let methodCount = 0;
    if (user.passwordHash) methodCount++;
    if (user.discordId) methodCount++;
    const googleCount = await prisma.userIdentity.count({
      where: { userId: user.id, provider: 'google' },
    });
    methodCount += googleCount;

    if (methodCount <= 1) {
      return res.status(400).json({
        error: 'Cannot disconnect your only authentication method. Please add another method or set a password first.',
      });
    }

    if (provider === 'discord') {
      await prisma.user.update({
        where: { id: user.id },
        data: { discordId: null as any },
      });
      await prisma.userIdentity.deleteMany({
        where: { userId: user.id, provider: 'discord' },
      });
    } else if (provider === 'google') {
      await prisma.userIdentity.deleteMany({
        where: { userId: user.id, provider: 'google' },
      });
    }

    return res.json({ success: true, message: `Disconnected ${provider} successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Unlink failed' });
  }
});


