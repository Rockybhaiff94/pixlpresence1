const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.resolve(rootDir, '../../.env') });
dotenv.config();

const dbUrl = process.env.DATABASE_URL?.trim();
const directUrl = process.env.DIRECT_URL?.trim();
if (!dbUrl || !directUrl) {
  throw new Error('DATABASE_URL and DIRECT_URL must be set before running db:push.');
}

console.log(`[db:push] Pushing schema to database (${dbUrl.includes('supabase') ? 'Supabase Postgres' : 'Database'})...`);

try {
  execSync('npx prisma db push --schema=prisma/schema.prisma', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      DIRECT_URL: directUrl,
    },
  });

  // Automatically enable RLS on all tables so Supabase Security Advisor remains satisfied
  execSync('node -r dotenv/config scripts/enable-rls.js', {
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
