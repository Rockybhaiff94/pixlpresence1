import 'dotenv/config';
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
  // Desktop client will emit 'authenticate' with their App Token
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

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
