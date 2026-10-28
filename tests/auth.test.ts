import { beforeEach, describe, it, expect, vi } from 'vitest';
import { ObjectId } from 'mongodb';
const state = vi.hoisted(() => ({ cookie: undefined as string|undefined, session: null as unknown, admin: null as unknown, inserted: vi.fn(), deleted: vi.fn(), set: vi.fn(), redirect: vi.fn((path:string) => { throw new Error(`REDIRECT:${path}`); }) }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => state.cookie ? {value:state.cookie} : undefined, set: (...args:unknown[]) => { state.set(...args); state.cookie = args[1] as string; } }) }));
vi.mock('next/navigation', () => ({ redirect: state.redirect }));
vi.mock('@/lib/mongodb', () => ({ getDb: async () => ({ collection:(name:string) => ({ insertOne:state.inserted,deleteOne:state.deleted,findOne:async () => name==='admin_sessions' ? state.session : state.admin }) }) }));
import { createSession, currentAdmin, destroySession, requireAdmin, requireAdminPage } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/crypto';
beforeEach(() => { state.cookie=undefined;state.session=null;state.admin=null;state.set.mockClear();state.deleted.mockClear();process.env.AUTH_SECRET='this-is-a-test-secret-of-more-than-32-characters'; });
describe('administrator authentication', () => {
 it('hashes passwords with unique salts and verifies correct passwords', async () => { const hash=await hashPassword('a very long passphrase');expect(hash).not.toContain('a very long passphrase');expect(await verifyPassword('a very long passphrase',hash)).toBe(true);expect(await verifyPassword('wrong',hash)).toBe(false);expect(await hashPassword('a very long passphrase')).not.toBe(hash); });
 it('creates an encrypted HttpOnly session with a hashed revocable DB credential', async () => { await createSession(new ObjectId()); expect(state.cookie).toBeTruthy();expect(state.inserted).toHaveBeenCalledWith(expect.objectContaining({tokenHash:expect.stringMatching(/^[a-f0-9]{64}$/),expiresAt:expect.any(Date)}));expect(state.set).toHaveBeenCalledWith('recallmd_admin',expect.any(String),expect.objectContaining({httpOnly:true,sameSite:'strict',maxAge:28800})); });
 it('rejects unauthorized API access and redirects protected pages on the server', async () => { await expect(requireAdmin()).rejects.toMatchObject({status:401});await expect(requireAdminPage()).rejects.toThrow('REDIRECT:/admin/login'); });
 it('validates session and active role, exposes no password hash', async () => { const id=new ObjectId();await createSession(id);state.session={adminId:id};state.admin={_id:id,email:'research@example.com',role:'admin'};expect(await currentAdmin()).toEqual({id:id.toHexString(),email:'research@example.com',role:'admin'});state.admin=null;expect(await currentAdmin()).toBeNull(); });
 it('revokes the database session and clears the cookie on logout', async () => { await createSession(new ObjectId());await destroySession();expect(state.deleted).toHaveBeenCalledWith({tokenHash:expect.any(String)});expect(state.set).toHaveBeenLastCalledWith('recallmd_admin','',expect.objectContaining({maxAge:0})); });
 it('rejects a tampered session cookie', async () => { state.cookie='tampered-token';expect(await currentAdmin()).toBeNull(); });
});
