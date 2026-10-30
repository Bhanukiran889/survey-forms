import { beforeEach, describe, it, expect, vi } from 'vitest';
const state=vi.hoisted(()=>({connect:vi.fn(),clientCount:0}));
vi.mock('mongodb',()=>({MongoClient:class { constructor(){state.clientCount++;} connect(){return state.connect();} }}));
import { connectDatabase, ensureIndexes } from '@/lib/mongodb';
import type { Db } from 'mongodb';
beforeEach(()=>{global.recallMongo=undefined;global.recallIndexes=undefined;state.clientCount=0;state.connect.mockReset();process.env.MONGODB_URI='mongodb://test.invalid';process.env.MONGODB_DB_NAME='unit_tests_only';});
describe('MongoDB connection lifecycle',()=>{
 it('handles failures safely and retries a failed cached connection',async()=>{state.connect.mockRejectedValue(new Error('raw database failure with private URI'));await expect(connectDatabase()).rejects.toThrow('research service is temporarily unavailable');await expect(connectDatabase()).rejects.toThrow('research service is temporarily unavailable');expect(state.clientCount).toBe(2);});
 it('reuses a successful connection across requests',async()=>{const database={};state.connect.mockResolvedValue({db:()=>database});expect(await connectDatabase()).toBe(database);expect(await connectDatabase()).toBe(database);expect(state.clientCount).toBe(1);});
 it('creates unique idempotency and draft/session/response TTL indexes',async()=>{const createIndexes=vi.fn(),createIndex=vi.fn();await ensureIndexes({collection:()=>({createIndexes,createIndex})} as unknown as Db);const specs=createIndexes.mock.calls.flatMap(c=>c[0]);expect(specs).toContainEqual({key:{submissionToken:1},unique:true});expect(specs).toContainEqual({key:{anonymousSessionId:1},unique:true});expect(specs.filter(s=>s.expireAfterSeconds===0).length).toBe(8);expect(createIndex).toHaveBeenCalledWith({expiresAt:1},{expireAfterSeconds:0});});
});
