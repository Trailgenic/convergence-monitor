import { ensureSchema } from '../lib/schema';

async function main() {
  const hasDatabaseUrl = Boolean(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING);
  if (!hasDatabaseUrl) {
    console.log('Skipping schema initialization: no Postgres connection string configured');
    return;
  }

  await ensureSchema();
  console.log('Schema initialized');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
