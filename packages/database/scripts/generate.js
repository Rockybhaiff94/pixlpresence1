const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.resolve(rootDir, '../../.env') });
dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

console.log(`[generate] Generating Prisma Client (${dbUrl.startsWith('file:') ? 'SQLite' : 'Remote'})...`);

try {
  execSync('npx prisma generate --schema=prisma/schema.prisma', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
  });
} catch (err) {
  process.exit(1);
}
