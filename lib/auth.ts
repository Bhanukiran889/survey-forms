import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sealData, unsealData } from 'iron-session';
import { ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import { randomToken, hashToken } from './crypto';
import { securityEnv } from './env';
import { HttpError } from './http';
import type { AdminSession, AdminUser } from '@/models/admin-user';
export const ADMIN_COOKIE = 'recallmd_admin';
export const SESSION_SECONDS = 8 * 60 * 60;
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/' };
export async function createSession(adminId: ObjectId) {
  const token = randomToken(); const db = await getDb();
  await db.collection<AdminSession>('admin_sessions').insertOne({ adminId, tokenHash: hashToken(token), createdAt: new Date(), expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
  const sealed = await sealData({ token }, { password: securityEnv().AUTH_SECRET, ttl: SESSION_SECONDS });
  (await cookies()).set(ADMIN_COOKIE, sealed, { ...cookieOptions, maxAge: SESSION_SECONDS });
}
async function sessionToken() {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return null;
  const data = await unsealData<{ token?: string }>(value, { password: securityEnv().AUTH_SECRET, ttl: SESSION_SECONDS });
  return data.token && /^[a-f0-9]{64}$/.test(data.token) ? data.token : null;
}
export async function currentAdmin() {
  const token = await sessionToken(); if (!token) return null;
  const db = await getDb();
  const session = await db.collection<AdminSession>('admin_sessions').findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const admin = await db.collection<AdminUser>('admin_users').findOne({ _id: session.adminId, active: true, role: 'admin' }, { projection: { email: 1, role: 1 } });
  return admin ? { id: admin._id!.toHexString(), email: admin.email, role: admin.role } : null;
}
export async function requireAdmin() { const admin = await currentAdmin(); if (!admin) throw new HttpError(401, 'UNAUTHORIZED', 'Please sign in to the researcher workspace.'); return admin; }
export async function requireAdminPage() { const admin = await currentAdmin(); if (!admin) redirect('/admin/login'); return admin; }
export async function destroySession() {
  const token = await sessionToken();
  if (token) await (await getDb()).collection<AdminSession>('admin_sessions').deleteOne({ tokenHash: hashToken(token) });
  (await cookies()).set(ADMIN_COOKIE, '', { ...cookieOptions, maxAge: 0 });
}
