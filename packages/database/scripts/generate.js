const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.resolve(rootDir, '../../.env') });
dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres.zvebxnogbidjjnuelpec:tHpg8oylNnBdwEU5@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const directUrl = process.env.DIRECT_URL || 'postgresql://postgres.zvebxnogbidjjnuelpec:tHpg8oylNnBdwEU5@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

console.log(`[generate] Generating Prisma Client...`);

try {
  execSync('npx prisma generate --schema=prisma/schema.prisma', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      DIRECT_URL: directUrl,
    },
  });

  // Synchronize generated client to root and workspace node_modules
  const localPrisma = path.join(rootDir, 'node_modules', '.prisma');
  const localPrismaClient = path.join(rootDir, 'node_modules', '@prisma', 'client');

  const targets = [
    path.resolve(rootDir, '../../node_modules'),
    path.resolve(rootDir, '../../apps/api/node_modules'),
    path.resolve(rootDir, '../../apps/bot/node_modules'),
  ];

  for (const target of targets) {
    if (fs.existsSync(target)) {
      if (fs.existsSync(localPrisma)) {
        fs.cpSync(localPrisma, path.join(target, '.prisma'), { recursive: true, force: true });
      }
      if (fs.existsSync(localPrismaClient)) {
        fs.cpSync(localPrismaClient, path.join(target, '@prisma', 'client'), { recursive: true, force: true });
      }
    }
  }

  console.log(`[generate] Successfully synchronized Prisma Client across workspaces.`);
} catch (err) {
  console.error('[generate] Error generating or syncing Prisma client:', err);
  process.exit(1);
}
