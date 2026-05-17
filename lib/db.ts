import { sql } from '@vercel/postgres';

export { sql };

export function assertCronAuth(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}
