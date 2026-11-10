import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../packages/database/prisma/.env') });
dotenv.config();

const requiredEnvironmentVariables = ['DATABASE_URL', 'DIRECT_URL', 'SESSION_SECRET'];
const missingEnvironmentVariables = requiredEnvironmentVariables.filter((key) => !process.env[key]?.trim());
if (missingEnvironmentVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironmentVariables.join(', ')}`);
}
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL?.trim()) {
  throw new Error('Missing required environment variable: FRONTEND_URL');
}

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { prisma } from '@discord-rpc/database';
import { authRouter } from './auth';
import { profileRouter } from './routes/profile';
import { rpcRouter } from './routes/rpc';
import { adminRouter } from './routes/admin';
import { guildRouter } from './routes/guild';
import { accountRouter } from './routes/account';

import { Server } from 'socket.io';
import http from 'http';
import { startBot, stopBot, getBotStatus } from 'bot';

const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  // PixelsRPC Vencord plugin will emit 'authenticate' with user's App Token
  socket.on('authenticate', async (token) => {
    const user = await prisma.user.findUnique({ where: { appToken: token } });
    if (user) {
      socket.join(`user_${user.id}`);
      socket.emit('authenticated', true);
    } else {
      socket.emit('authenticated', false);
    }
  });
});

const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from web app, discord desktop/web clients, or curl/no-origin
    if (!origin || origin === 'null' || origin.includes('discord.com') || origin.includes('localhost') || (process.env.FRONTEND_URL && origin.includes(process.env.FRONTEND_URL))) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const rpcUploadsDir = path.join(uploadsDir, 'rpc');
if (!fs.existsSync(rpcUploadsDir)) fs.mkdirSync(rpcUploadsDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Setup Session Store with Prisma
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(
      prisma,
      {
        checkPeriod: 2 * 60 * 1000,  // ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }
    )
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(['/auth', '/api/auth'], authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/rpc', rpcRouter);
app.use('/api/admin', adminRouter);
app.use('/api/guild', guildRouter);
app.use('/api/account', accountRouter);

app.get('/', (req: express.Request, res: express.Response) => {
  res.json({ message: 'Discord RPC Platform API is running.' });
});

app.get(['/health', '/api/health'], (req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'pixelgg-api',
    uptime: process.uptime(),
    bot: getBotStatus(),
  });
});

// Global Express Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  if (res.headersSent) {
    return next(err);
  }

  if (req.path.includes('/auth/discord/callback') || req.path.startsWith('/auth/')) {
    const frontend = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://pixlpresence1-web.vercel.app' : 'http://localhost:3000');
    return res.redirect(`${frontend}/?error=${encodeURIComponent(err.message || 'Authentication error')}`);
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
  });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[PixelGG Backend] Central API & Discord Bot listening on http://0.0.0.0:${PORT}`);

  // Automatically start Discord Bot companion if DISCORD_BOT_TOKEN is present
  startBot().catch((err) => {
    console.error('[PixelGG Backend] Discord Bot failed to initialize:', err);
  });
});

// Process lifecycle management and graceful shutdown
let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[PixelGG Backend] Received ${signal}. Starting graceful shutdown...`);

  // 1. Close HTTP server
  server.close(() => {
    console.log('[PixelGG Backend] HTTP server closed.');
  });

  // 2. Close Socket.IO
  try {
    io.close();
    console.log('[PixelGG Backend] Socket.IO server closed.');
  } catch (err) {
    console.error('[PixelGG Backend] Error closing Socket.IO:', err);
  }

  // 3. Gracefully stop Discord Bot
  try {
    await stopBot();
    console.log('[PixelGG Backend] Discord Bot disconnected.');
  } catch (err) {
    console.error('[PixelGG Backend] Error stopping Discord Bot:', err);
  }

  // 4. Disconnect database connection pool
  try {
    await prisma.$disconnect();
    console.log('[PixelGG Backend] Database connections disconnected.');
  } catch (err) {
    console.error('[PixelGG Backend] Error disconnecting database:', err);
  }

  console.log('[PixelGG Backend] Graceful shutdown complete. Exiting.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[PixelGG Backend Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[PixelGG Backend Uncaught Exception]:', err);
});
