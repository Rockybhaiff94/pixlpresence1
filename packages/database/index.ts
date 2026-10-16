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

const defaultDatabaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres.zvebxnogbidjjnuelpec:tHpg8oylNnBdwEU5@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
process.env.DATABASE_URL = defaultDatabaseUrl;

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL =
    'postgresql://postgres.zvebxnogbidjjnuelpec:tHpg8oylNnBdwEU5@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
}

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
