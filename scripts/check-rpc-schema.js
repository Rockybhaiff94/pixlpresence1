const path = require('path');
const dotenv = require('dotenv');
const dbEnv = path.resolve(__dirname, '../../packages/database/.env');
dotenv.config({ path: dbEnv });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to Database successfully!');
    const cols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'RichPresence';
    `;
    console.log('Existing RichPresence columns:', cols);
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
