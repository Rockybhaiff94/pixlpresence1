import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';
export * from '@quixo3/prisma-session-store';

// Load .env files if available
dotenv.config({ path: path.resolve(__dirname, 'prisma/.env') });
dotenv.config({ path: path.resolve(__dirname, '../prisma/.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const defaultDatabaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
process.env.DATABASE_URL = defaultDatabaseUrl;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: defaultDatabaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
