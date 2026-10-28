import { beforeEach, describe, it, expect } from 'vitest';
import { assertSameOrigin, readJson, handleError, HttpError } from '@/lib/http';
import { DatabaseUnavailable } from '@/lib/mongodb';
import { z } from 'zod';
beforeEach(() => { process.env.AUTH_SECRET = 'test-only-secret-which-is-at-least-32-characters'; process.env.APP_URL = 'http://localhost:3000'; });
describe('request protections', () => {
 it('requires an exact same-origin mutation', () => { expect(() => assertSameOrigin(new Request('http://localhost:3000/api', { headers: { origin: 'https://attacker.example' } }))).toThrow(HttpError); expect(() => assertSameOrigin(new Request('http://localhost:3000/api', { headers: { origin:'http://localhost:3000' } }))).not.toThrow(); });
 it('rejects oversized bodies even without Content-Length', async () => { const req = new Request('http://localhost:3000/api', { method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'x'.repeat(66000)}) }); await expect(readJson(req,z.object({text:z.string()}))).rejects.toMatchObject({status:413}); });
 it('rejects invalid JSON, content types, and unknown request fields', async () => { await expect(readJson(new Request('http://x',{method:'POST',body:'x'}),z.object({}))).rejects.toMatchObject({status:415}); await expect(readJson(new Request('http://x',{method:'POST',headers:{'content-type':'application/json'},body:'{'}),z.object({}))).rejects.toMatchObject({status:400}); });
 it('returns a safe 503 for MongoDB connection failures', async () => { const r=handleError(new DatabaseUnavailable()); expect(r.status).toBe(503); expect(await r.json()).toEqual({error:{code:'DATABASE_UNAVAILABLE',message:expect.any(String)}}); });
 it('returns a safe setup error without leaking credentials', async () => { const r=handleError(new Error('CONFIG_DATABASE')); expect(r.status).toBe(503); expect(await r.text()).not.toContain('mongodb+srv'); });
});
