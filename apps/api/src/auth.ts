import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { prisma } from '@discord-rpc/database';
import { Router } from 'express';
import crypto from 'crypto';

function cleanEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  return trimmed || fallback;
}

const DISCORD_CLIENT_ID = cleanEnv(process.env.DISCORD_CLIENT_ID, '1523632136878559302');
const DISCORD_CLIENT_SECRET = cleanEnv(process.env.DISCORD_CLIENT_SECRET, '2MbiMbAAS3S333QmWMPSVUDoBT0hAZPh');
const DISCORD_CALLBACK_URL = cleanEnv(
  process.env.DISCORD_CALLBACK_URL,
  process.env.NODE_ENV === 'production'
    ? 'https://pixlpresence1.onrender.com/auth/discord/callback'
    : 'http://localhost:3001/auth/discord/callback'
);
const FRONTEND_URL = cleanEnv(
  process.env.FRONTEND_URL,
  process.env.NODE_ENV === 'production'
    ? 'https://pixlpresence1-web.vercel.app'
    : 'http://localhost:3000'
);

const scopes = ['identify', 'email'];

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
        const avatar = profile.avatar || null;
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

        console.log(`[Discord OAuth] Successfully authenticated: ${user.username} (${user.id})`);
        return done(null, user);
      } catch (err) {
        console.error('[Discord OAuth Verify Error]:', err);
        return done(err as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
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

authRouter.get('/discord', passport.authenticate('discord'));

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
      console.log(`[Discord OAuth] User ${user.username} logged in successfully. Redirecting.`);
      // Pass token in URL parameter so cross-domain environments (e.g. Brave shields) can authenticate without 3rd party cookie
      const redirectUrl = user.appToken
        ? `${FRONTEND_URL}/dashboard?token=${encodeURIComponent(user.appToken)}`
        : `${FRONTEND_URL}/dashboard`;
      return res.redirect(redirectUrl);
    });
  })(req, res, next);
});

authRouter.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect(`${FRONTEND_URL}/`);
  });
});

authRouter.get('/me', async (req: any, res) => {
  try {
    let user = req.user;

    // Support Bearer token header if session cookie is blocked by browser cross-site policy
    if (!user && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]?.trim();
        if (token) {
          user = await prisma.user.findFirst({ where: { appToken: token } });
        }
      }
    }

    if (user) {
      if (!user.appToken) {
        const generatedToken = crypto.randomBytes(32).toString('hex');
        user = await prisma.user.update({
          where: { id: user.id },
          data: { appToken: generatedToken },
        });
        req.user = user;
      }
      return res.json(user);
    }

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});


