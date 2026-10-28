import { beforeEach,it,expect,vi } from 'vitest';
const state=vi.hoisted(()=>({count:1,update:vi.fn()}));
vi.mock('@/lib/mongodb',()=>({getDb:async()=>({collection:()=>({findOneAndUpdate:async(...args:unknown[])=>{state.update(...args);return {count:state.count};}})})}));
import { rateLimit } from '@/lib/rate-limit';
beforeEach(()=>{state.count=1;state.update.mockClear();});
it('persists only a hashed window bucket and an expiring atomic counter',async()=>{await rateLimit('login','private@example.com',10);const [filter,update,options]=state.update.mock.calls[0];expect(filter._id).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(filter)).not.toContain('private@example.com');expect(update.$inc.count).toBe(1);expect(update.$setOnInsert.expiresAt).toBeInstanceOf(Date);expect(options.upsert).toBe(true);});
it('rejects exhausted buckets with 429',async()=>{state.count=11;await expect(rateLimit('test','session',10)).rejects.toMatchObject({status:429,code:'RATE_LIMITED'});});
