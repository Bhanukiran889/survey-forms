import { z } from 'zod';

export const BOT_ACTION = 'survey-submit';
export const MIN_SURVEY_AGE_MS = 8_000;
export const BOT_TICKET_SECONDS = 2 * 60 * 60;
export const botProofSchema = z.object({
  ticket: z.string().min(1).max(4096),
  website: z.string().max(200).default(''),
  turnstileToken: z.string().max(2048).optional(),
}).strict();
export type BotProof = z.infer<typeof botProofSchema>;
export type BotVerification = { method: 'basic' | 'turnstile'; verifiedAt: Date };
export type ProtectionChallenge = { mode: 'basic' | 'turnstile'; ticket: string; binding: string; readyInMs: number; siteKey?: string };
