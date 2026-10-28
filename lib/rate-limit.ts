import 'server-only';
import { getDb } from './mongodb';
import { hashToken } from './crypto';
import { HttpError } from './http';
// Shared MongoDB counters work across serverless instances; no IPs are collected.
export async function rateLimit(bucket: string, subject: string, limit: number, windowMs = 15 * 60 * 1000) {
  const db = await getDb(); const window = Math.floor(Date.now() / windowMs);
  const id = hashToken(`${bucket}:${subject}:${window}`);
  const counters = db.collection<{ _id: string; count: number; expiresAt: Date }>('rate_limits');
  const counter = await counters.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * windowMs) } }, { upsert: true, returnDocument: 'after' });
  if (!counter || counter.count > limit) throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please try again in 15 minutes.');
}
