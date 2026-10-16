import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../packages/database/prisma/.env') });
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://postgres.zvebxnogbidjjnuelpec:tHpg8oylNnBdwEU5@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL =
    'postgresql://postgres.zvebxnogbidjjnuelpec:tHpg8oylNnBdwEU5@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
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

import { Server } from 'socket.io';
import http from 'http';

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

app.use(express.json());

// Setup Session Store with Prisma
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    secret: process.env.SESSION_SECRET || 'super_secret_discord_rpc_key',
    resave: true,
    saveUninitialized: true,
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

app.use('/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/rpc', rpcRouter);
app.use('/api/admin', adminRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Discord RPC Platform API is running.' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
