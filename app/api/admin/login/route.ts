import { route, readJson, assertSameOrigin, json, HttpError } from '@/lib/http';
import { loginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { getDb } from '@/lib/mongodb';
import { verifyPassword } from '@/lib/crypto';
import { createSession, destroySession } from '@/lib/auth';
import type { AdminUser } from '@/models/admin-user';
export const runtime = 'nodejs';
// Perform a real scrypt operation even for an unknown account.
const dummyHash = 'scrypt:00000000000000000000000000000000:' + '0'.repeat(128);
export const POST = route(async request => {
  assertSameOrigin(request); const data = await readJson(request, loginSchema);
  await rateLimit('login-global', 'all', 200); await rateLimit('login-email', data.email, 10);
  const db = await getDb(); const admin = await db.collection<AdminUser>('admin_users').findOne({ email: data.email, active: true, role: 'admin' });
  const valid = await verifyPassword(data.password, admin?.passwordHash ?? dummyHash);
  if (!admin || !valid) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  await destroySession(); await createSession(admin._id!);
  await db.collection<AdminUser>('admin_users').updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  return json({ authenticated: true });
});
