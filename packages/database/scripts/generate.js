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

  const searchDirs = [
    path.join(rootDir, 'node_modules'),
    path.resolve(rootDir, '../../node_modules'),
  ];

  let sourcePrisma = null;
  let sourcePrismaClient = null;

  for (const dir of searchDirs) {
    const p1 = path.join(dir, '.prisma');
    const p2 = path.join(dir, '@prisma', 'client');
    if (fs.existsSync(p1) && fs.existsSync(p2)) {
      sourcePrisma = p1;
      sourcePrismaClient = p2;
      break;
    }
  }

  if (sourcePrisma && sourcePrismaClient) {
    const targets = [
      path.resolve(rootDir, '..', '..', 'node_modules'),
      path.resolve(rootDir, '..', '..', 'apps', 'api', 'node_modules'),
      path.resolve(rootDir, '..', '..', 'apps', 'bot', 'node_modules'),
      path.join(rootDir, 'node_modules'),
    ];

    for (const target of targets) {
      if (fs.existsSync(target) && path.resolve(target) !== path.dirname(sourcePrisma)) {
        try {
          fs.cpSync(sourcePrisma, path.join(target, '.prisma'), { recursive: true, force: true });
          fs.cpSync(sourcePrismaClient, path.join(target, '@prisma', 'client'), { recursive: true, force: true });
        } catch (e) {
          // ignore
        }
      }
    }
  }

  console.log(`[generate] Successfully synchronized Prisma Client across workspaces.`);
} catch (err) {
  console.error('[generate] Error generating or syncing Prisma client:', err);
  process.exit(1);
}
