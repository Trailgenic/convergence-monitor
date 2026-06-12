import { ensureSchema } from '../lib/schema';

async function main() {
  await ensureSchema();
  console.log('DB initialized');
}

main().catch((e) => { console.error(e); process.exit(1); });
