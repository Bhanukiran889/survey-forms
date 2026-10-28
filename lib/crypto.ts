import 'server-only';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scryptAsync = promisify(scrypt);
export const randomToken = () => randomBytes(32).toString('hex');
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expected] = encoded.split(':');
  if (algorithm !== 'scrypt' || !salt || expected?.length !== 128) return false;
  const actual = await scryptAsync(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
