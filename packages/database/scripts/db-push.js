const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.resolve(rootDir, '../../.env') });
dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

console.log(`[db:push] Pushing schema with database URL (${dbUrl.startsWith('file:') ? 'SQLite' : 'Remote'})...`);

try {
  execSync('npx prisma db push --schema=prisma/schema.prisma --accept-data-loss', {
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
