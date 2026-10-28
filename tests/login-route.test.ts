import { beforeEach, describe, it, expect, vi } from 'vitest';
const state=vi.hoisted(()=>({admin:null as unknown,valid:false,create:vi.fn(),destroy:vi.fn(),update:vi.fn(),rate:vi.fn()}));
vi.mock('@/lib/auth',()=>({createSession:state.create,destroySession:state.destroy,requireAdmin:vi.fn(async()=>({id:'a'}))}));
vi.mock('@/lib/crypto',()=>({verifyPassword:vi.fn(async()=>state.valid)}));
vi.mock('@/lib/rate-limit',()=>({rateLimit:state.rate}));
vi.mock('@/lib/mongodb',()=>({getDb:async()=>({collection:()=>({findOne:async()=>state.admin,updateOne:state.update})})}));
import { POST as login } from '@/app/api/admin/login/route';
import { POST as logout } from '@/app/api/admin/logout/route';
function request(body:unknown){return new Request('http://localhost:3000/api/admin/login',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify(body)});}
beforeEach(()=>{state.admin=null;state.valid=false;state.create.mockClear();state.destroy.mockClear();process.env.AUTH_SECRET='test-auth-secret-of-more-than-32-characters';process.env.APP_URL='http://localhost:3000';});
describe('login and logout routes',()=>{
 it('returns a generic 401 for invalid credentials and never creates a session',async()=>{const r=await login(request({email:'x@example.com',password:'wrong'}));expect(r.status).toBe(401);expect(await r.json()).toMatchObject({error:{code:'INVALID_CREDENTIALS'}});expect(state.create).not.toHaveBeenCalled();});
 it('creates a session only after a valid password and records last login',async()=>{state.admin={_id:'admin-id',email:'a@example.com'};state.valid=true;const r=await login(request({email:'a@example.com',password:'valid password'}));expect(r.status).toBe(200);expect(state.destroy).toHaveBeenCalled();expect(state.create).toHaveBeenCalledWith('admin-id');expect(state.update).toHaveBeenCalledWith({_id:'admin-id'},{$set:{lastLoginAt:expect.any(Date)}});});
 it('rejects cross-site login before authentication',async()=>{const r=await login(new Request('http://localhost:3000/api',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'}));expect(r.status).toBe(403);expect(state.create).not.toHaveBeenCalled();});
 it('revokes the authenticated session on logout',async()=>{const r=await logout(request({}));expect(r.status).toBe(200);expect(state.destroy).toHaveBeenCalled();expect(await r.json()).toEqual({authenticated:false});});
});
