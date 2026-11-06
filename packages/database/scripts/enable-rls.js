const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'User',
    'Session',
    'Profile',
    'Link',
    'Button',
    'RichPresence',
    'ActivityTemplate',
    'AuditLog',
    'GuildConfiguration',
    'ProfileLayer',
    'SynchronizationEvent'
  ];

  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${t}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`[RLS] Enabled on table "${t}"`);
    } catch (err) {
      console.warn(`[RLS] Could not enable on "${t}":`, err.message);
    }
  }

  // Also check if any other public tables exist in postgres
  const allTables = await prisma.$queryRaw`
    SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r';
  `;

  for (const row of allTables) {
    if (!row.rls_enabled) {
      console.log(`[RLS] Found unenabled table: ${row.tablename}, enabling...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${row.tablename}" ENABLE ROW LEVEL SECURITY;`);
    }
  }

  console.log('[RLS] All public tables have Row Level Security enabled.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
