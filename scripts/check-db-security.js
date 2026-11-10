const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const allTables = await prisma.$queryRaw`
    SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `;
  console.log('Tables RLS status:');
  console.table(allTables);

  const policies = await prisma.$queryRaw`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd
    FROM pg_policies
    WHERE schemaname = 'public';
  `;
  console.log('Existing RLS policies count:', policies.length);
  if (policies.length > 0) {
    console.table(policies);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());

