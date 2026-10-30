import 'server-only';
import { sealData, unsealData } from 'iron-session';
import { z } from 'zod';
import { securityEnv } from './env';
import { hashToken } from './crypto';
import { HttpError } from './http';
import { botConfiguration } from './bot-config';
import { BOT_ACTION, BOT_TICKET_SECONDS, MIN_SURVEY_AGE_MS, type BotProof, type BotVerification, type ProtectionChallenge } from './bot-contract';

type DraftIdentity = { id: string; credentialHash: string };
type Ticket = { v: number; binding: string; startedAt: number; issuedAt: number };
const bindingFor = (draft: DraftIdentity) => hashToken(`survey-bot-v1:${draft.id}:${draft.credentialHash}`);
const retryMessage = 'Please reload the security check and try submitting again. Your saved answers are safe.';

export async function issueProtection(draft: DraftIdentity, createdAt: Date): Promise<ProtectionChallenge> {
  const config = botConfiguration();
  const now = Date.now();
  const binding = bindingFor(draft);
  const ticket = await sealData({ v: 1, binding, startedAt: createdAt.getTime(), issuedAt: now }, { password: securityEnv().AUTH_SECRET, ttl: BOT_TICKET_SECONDS });
  return { mode: config.mode, ticket, binding, readyInMs: Math.max(0, MIN_SURVEY_AGE_MS - (now - createdAt.getTime())), ...(config.mode === 'turnstile' ? { siteKey: config.siteKey } : {}) };
}

export async function verifyProtection(proof: BotProof, draft: DraftIdentity, alreadySubmitted = false): Promise<BotVerification> {
  if (proof.website.trim()) throw new HttpError(403, 'SPAM_REJECTED', 'We couldn’t accept this submission. Please reload the survey and try again.');
  const config = botConfiguration();
  const ticket = await unsealData<Partial<Ticket>>(proof.ticket, { password: securityEnv().AUTH_SECRET, ttl: BOT_TICKET_SECONDS });
  const now = Date.now();
  if (ticket.v !== 1 || ticket.binding !== bindingFor(draft) || !Number.isFinite(ticket.startedAt) || !Number.isFinite(ticket.issuedAt) || ticket.startedAt! > ticket.issuedAt! || ticket.issuedAt! > now || now - ticket.issuedAt! > BOT_TICKET_SECONDS * 1000) throw new HttpError(403, 'SECURITY_CHECK_REQUIRED', retryMessage);
  if (now - ticket.startedAt! < MIN_SURVEY_AGE_MS) throw new HttpError(429, 'SURVEY_TOO_FAST', 'Please take a moment to review your answers, then submit again.');

  // A retry only returns the original receipt. It cannot insert another response or change data.
  if (config.mode === 'basic' || alreadySubmitted) return { method: config.mode, verifiedAt: new Date() };
  if (!proof.turnstileToken) throw new HttpError(403, 'SECURITY_CHECK_REQUIRED', retryMessage);
  let response: Response;
  let result: { success: boolean; hostname?: string; action?: string; cdata?: string; 'error-codes'?: string[] };
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: config.secretKey, response: proof.turnstileToken }),
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('VERIFY_UNAVAILABLE');
    result = z.object({ success: z.boolean(), hostname: z.string().max(253).optional(), action: z.string().max(100).optional(), cdata: z.string().max(255).optional(), 'error-codes': z.array(z.string()).optional() }).parse(await response.json());
  } catch {
    throw new HttpError(503, 'SECURITY_CHECK_UNAVAILABLE', 'The security check is temporarily unavailable. Your draft is saved; please try again shortly.');
  }
  if (result['error-codes']?.some(code => ['missing-input-secret', 'invalid-input-secret'].includes(code))) throw new Error('CONFIG_BOT_PROTECTION');
  if (!result.success || result.hostname !== new URL(securityEnv().APP_URL).hostname || result.action !== BOT_ACTION || result.cdata !== bindingFor(draft)) throw new HttpError(403, 'SECURITY_CHECK_FAILED', retryMessage);
  return { method: 'turnstile', verifiedAt: new Date() };
}
