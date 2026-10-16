const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.resolve(rootDir, '../../.env') });
dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres.zvebxnogbidjjnuelpec:tHpg8oylNnBdwEU5@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const directUrl = process.env.DIRECT_URL || 'postgresql://postgres.zvebxnogbidjjnuelpec:tHpg8oylNnBdwEU5@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

console.log(`[db:push] Pushing schema to database (${dbUrl.includes('supabase') ? 'Supabase Postgres' : 'Database'})...`);

try {
  execSync('npx prisma db push --schema=prisma/schema.prisma --accept-data-loss', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      DIRECT_URL: directUrl,
    },
  });
} catch (err) {
  process.exit(1);
}
