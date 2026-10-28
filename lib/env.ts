import 'server-only';
import { z } from 'zod';
export function databaseEnv() {
  const result = z.object({ MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//), MONGODB_DB_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/).default('neetpg_research') }).safeParse(process.env);
  if (!result.success) throw new Error('CONFIG_DATABASE');
  return result.data;
}
export function securityEnv() {
  const result = z.object({ AUTH_SECRET: z.string().min(32), APP_URL: z.url().default('http://localhost:3000') }).safeParse(process.env);
  if (!result.success) throw new Error('CONFIG_SECURITY');
  if (process.env.NODE_ENV === 'production' && !result.data.APP_URL.startsWith('https://')) throw new Error('CONFIG_HTTPS');
  return result.data;
}
export function responseRetentionDays() {
  const value = Number(process.env.RESPONSE_RETENTION_DAYS ?? 365);
  if (!Number.isInteger(value) || value < 1 || value > 3650) throw new Error('CONFIG_RETENTION');
  return value;
}
