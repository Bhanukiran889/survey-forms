import { beforeEach, describe, it, expect, vi } from 'vitest';
const state=vi.hoisted(()=>({authorized:false,collection:vi.fn(),find:vi.fn(),skip:vi.fn(),limit:vi.fn(),rows:[] as unknown[],count:0}));
vi.mock('@/lib/auth',()=>({requireAdmin:async()=>{if(!state.authorized) throw new HttpError(401,'UNAUTHORIZED','Sign in');return {id:'admin',email:'a@example.com',role:'admin'};}}));
vi.mock('@/lib/rate-limit',()=>({rateLimit:vi.fn()}));
vi.mock('@/lib/mongodb',()=>({getDb:async()=>({collection:state.collection})}));
vi.mock('@/lib/analytics',()=>({getAnalytics:vi.fn(async()=>({total:0,drafts:0,completionRate:null}))}));
import { HttpError } from '@/lib/http';
import { GET as analytics } from '@/app/api/admin/analytics/route';
import { GET as responses } from '@/app/api/admin/responses/route';
import { GET as session } from '@/app/api/admin/session/route';
import { GET as exportCsv } from '@/app/api/admin/export/route';
import { GET as detail } from '@/app/api/admin/responses/[id]/route';
beforeEach(()=>{state.authorized=false;state.collection.mockClear();state.rows=[];state.count=0;state.find.mockImplementation(()=>({sort:()=>({skip:(n:number)=>{state.skip(n);return {limit:(size:number)=>{state.limit(size);return {toArray:async()=>state.rows};}};}})}));state.collection.mockReturnValue({find:state.find,countDocuments:async()=>state.count});});
describe('admin API authorization and data access',()=>{
 it.each([['analytics',analytics],['responses',responses],['session',session],['export',exportCsv]] as const)('rejects unauthorized %s requests before DB access',async(_name,fn)=>{const r=await fn(new Request('http://localhost/api'));expect(r.status).toBe(401);expect(state.collection).not.toHaveBeenCalled();});
 it('rejects unauthorized response detail access before identifier lookup',async()=>{const r=await detail(new Request('http://localhost/api'),{params:Promise.resolve({id:'abc'})});expect(r.status).toBe(401);expect(state.collection).not.toHaveBeenCalled();});
 it('applies pagination in the response query',async()=>{state.authorized=true;state.count=101;const r=await responses(new Request('http://localhost/api?page=3&limit=20'));expect(r.status).toBe(200);expect(state.skip).toHaveBeenCalledWith(40);expect(state.limit).toHaveBeenCalledWith(20);expect(await r.json()).toMatchObject({page:3,pages:6,total:101,limit:20});});
 it('exports a bounded CSV page with count headers',async()=>{state.authorized=true;state.count=101;const r=await exportCsv(new Request('http://localhost/api?page=2&limit=50'));expect(r.status).toBe(200);expect(r.headers.get('content-type')).toContain('text/csv');expect(r.headers.get('X-Total-Pages')).toBe('3');expect(r.headers.get('X-Export-Page')).toBe('2');expect(state.skip).toHaveBeenCalledWith(50);expect(await r.text()).toContain('Q28.');});
});
