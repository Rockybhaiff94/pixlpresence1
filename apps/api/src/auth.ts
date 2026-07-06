import passport from 'passport';
import { Strategy as DiscordStrategy, Profile } from 'passport-discord';
import { prisma } from '@discord-rpc/database';
import { Router } from 'express';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || 'your_client_id';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'your_client_secret';
const DISCORD_CALLBACK_URL = process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback';

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
        const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',');
        const isAdmin = adminIds.includes(profile.id);

        const user = await prisma.user.upsert({
          where: { discordId: profile.id },
          update: {
            username: profile.username,
            globalName: profile.global_name,
            avatar: profile.avatar,
            banner: profile.banner,
            email: profile.email,
            nitroStatus: profile.premium_type || 0,
          },
          create: {
            discordId: profile.id,
            username: profile.username,
            globalName: profile.global_name,
            avatar: profile.avatar,
            banner: profile.banner,
            email: profile.email,
            nitroStatus: profile.premium_type || 0,
            // @ts-ignore - The role field exists in Prisma schema but IDE cache might be stale
            role: isAdmin ? 'ADMIN' : 'USER',
          },
        });
        
        // Also ensure a profile exists
        await prisma.profile.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            displayName: profile.global_name || profile.username,
            avatarUrl: profile.avatar,
          }
        });

        return done(null, user);
      } catch (err) {
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
    done(err, null);
  }
});

export const authRouter = Router();

authRouter.get('/discord', passport.authenticate('discord'));

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

authRouter.get(
  '/discord/callback',
  passport.authenticate('discord', { failureRedirect: `${FRONTEND_URL}/` }),
  (req, res) => {
    // Redirect to the frontend dashboard on success
    res.redirect(`${FRONTEND_URL}/dashboard`);
  }
);

authRouter.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect(`${FRONTEND_URL}/`);
  });
});

authRouter.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
