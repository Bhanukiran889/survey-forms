import { randomBytes, scrypt } from 'node:crypto';
const N = 131072, r = 8, p = 1;
function derive(password: string, salt: string, cost = N): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: cost, r, p, maxmem: 256 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${N}:${r}:${p}:${salt}:${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split(':');
  // Support the initial three-part format when upgrading an existing installation.
  const legacy = parts.length === 3;
  if (parts[0] !== 'scrypt' || (!legacy && (parts.length !== 6 || parts[1] !== String(N) || parts[2] !== String(r) || parts[3] !== String(p)))) return false;
  const salt = parts[legacy ? 1 : 4], expected = parts[legacy ? 2 : 5];
  if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(expected)) return false;
  const actual = await derive(password, salt, legacy ? 16384 : N);
  const { timingSafeEqual } = await import('node:crypto');
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
