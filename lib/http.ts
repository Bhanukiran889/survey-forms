import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { securityEnv } from './env';
import { DatabaseUnavailable } from './mongodb';
export class HttpError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(securityEnv().APP_URL).origin) throw new HttpError(403, 'INVALID_ORIGIN', 'Please submit from the research website.');
  const site = request.headers.get('sec-fetch-site');
  if (site && !['same-origin', 'none'].includes(site)) throw new HttpError(403, 'INVALID_ORIGIN', 'Cross-site requests are not allowed.');
}
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'CONTENT_TYPE', 'Please send JSON.');
  if (Number(request.headers.get('content-length') ?? 0) > 65536) throw new HttpError(413, 'TOO_LARGE', 'The request is too large.');
  // Bound streamed bodies as well as Content-Length; clients can omit that header.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'INVALID_JSON', 'A request body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 65536) { await reader.cancel(); throw new HttpError(413, 'TOO_LARGE', 'The request is too large.'); } chunks.push(value); }
  let json: unknown;
  try { json = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'INVALID_JSON', 'The JSON body is malformed.'); }
  return schema.parse(json);
}
export function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function handleError(error: unknown) {
  if (error instanceof z.ZodError) return json({ error: { code: 'VALIDATION_ERROR', message: 'Please check your answers.', fields: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } }, 422);
  if (error instanceof HttpError) return json({ error: { code: error.code, message: error.message } }, error.status);
  if (error instanceof Error && error.message.startsWith('CONFIG_')) return json({ error: { code: 'NOT_CONFIGURED', message: 'The research service is awaiting configuration. Your answers have not been submitted. Please try again later.' } }, 503);
  if (error instanceof DatabaseUnavailable) return json({ error: { code: 'DATABASE_UNAVAILABLE', message: error.message } }, 503);
  console.error('Research request failed', { category: 'UNEXPECTED_ERROR' });
  return json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } }, 500);
}
export const route = (fn: (request: Request) => Promise<Response>) => async (request: Request) => { try { return await fn(request); } catch (error) { return handleError(error); } };
