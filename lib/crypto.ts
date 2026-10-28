import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
export { hashPassword, verifyPassword } from './password';
export const randomToken = () => randomBytes(32).toString('hex');
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
