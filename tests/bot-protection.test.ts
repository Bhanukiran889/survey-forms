import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botConfiguration } from '@/lib/bot-config';
import { BOT_ACTION, BOT_TICKET_SECONDS, MIN_SURVEY_AGE_MS } from '@/lib/bot-contract';
import { issueProtection, verifyProtection } from '@/lib/bot-protection';
import { protectedSubmissionSchema } from '@/lib/validation';
import { validSubmission } from './fixtures';

const draft = { id: '123e4567-e89b-42d3-a456-426614174000', credentialHash: 'a'.repeat(64) };
const oldDraft = () => new Date(Date.now() - MIN_SURVEY_AGE_MS - 1000);
const enhanced = () => { vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'unit-test-public-site-key'); vi.stubEnv('TURNSTILE_SECRET_KEY', 'unit-test-private-secret-key'); };
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('AUTH_SECRET', 'bot-test-secret-at-least-thirty-two-characters');
  vi.stubEnv('APP_URL', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '');
  vi.stubEnv('TURNSTILE_SECRET_KEY', '');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('bot protection configuration', () => {
  it('enables basic protection without external credentials', () => { expect(botConfiguration()).toEqual({ mode: 'basic' }); });
  it('fails closed for partial setup and production dummy keys', () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'configured-public-key');
    expect(botConfiguration).toThrow('CONFIG_BOT_PROTECTION');
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '1x00000000000000000000AA');
    vi.stubEnv('TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA');
    vi.stubEnv('NODE_ENV', 'production');
    expect(botConfiguration).toThrow('CONFIG_BOT_TEST_KEYS');
  });
});

describe('server enforced submission checks', () => {
  it('requires proof even for an otherwise valid submission', () => {
    const submission = { ...validSubmission(), termsAccepted: true, privacyAcknowledged: true };
    expect(protectedSubmissionSchema.safeParse(submission).success).toBe(false);
    expect(protectedSubmissionSchema.safeParse({ ...submission, termsAccepted: false, protection: { ticket: 'not-yet-verified', website: '' } }).success).toBe(false);
  });
  it('accepts a signed ticket for the matching browser and saves only a verdict', async () => {
    const challenge = await issueProtection(draft, oldDraft());
    const result = await verifyProtection({ ticket: challenge.ticket, website: '' }, draft);
    expect(challenge.readyInMs).toBe(0);
    expect(result).toEqual({ method: 'basic', verifiedAt: expect.any(Date) });
    expect(JSON.stringify(result)).not.toContain(challenge.ticket);
  });
  it('rejects hidden-field spam', async () => {
    const challenge = await issueProtection(draft, oldDraft());
    await expect(verifyProtection({ ticket: challenge.ticket, website: 'spam.invalid' }, draft)).rejects.toMatchObject({ status: 403, code: 'SPAM_REJECTED' });
  });
  it('rejects forged tickets and tickets copied to another draft', async () => {
    const challenge = await issueProtection(draft, oldDraft());
    await expect(verifyProtection({ ticket: 'forged', website: '' }, draft)).rejects.toMatchObject({ status: 403 });
    await expect(verifyProtection({ ticket: challenge.ticket, website: '' }, { ...draft, credentialHash: 'b'.repeat(64) })).rejects.toMatchObject({ status: 403 });
  });
  it('rejects instant submissions based on server time', async () => {
    const challenge = await issueProtection(draft, new Date());
    expect(challenge.readyInMs).toBeGreaterThan(0);
    await expect(verifyProtection({ ticket: challenge.ticket, website: '' }, draft)).rejects.toMatchObject({ status: 429, code: 'SURVEY_TOO_FAST' });
  });
  it('rejects expired tickets', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const challenge = await issueProtection(draft, oldDraft());
    vi.setSystemTime(Date.now() + (BOT_TICKET_SECONDS + 120) * 1000);
    await expect(verifyProtection({ ticket: challenge.ticket, website: '' }, draft)).rejects.toMatchObject({ status: 403 });
  });
});

describe('enhanced verification', () => {
  it('checks the host, action and browser binding without sending answers, email or IP', async () => {
    enhanced();
    const challenge = await issueProtection(draft, oldDraft());
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true, hostname: 'localhost', action: BOT_ACTION, cdata: challenge.binding }));
    vi.stubGlobal('fetch', fetch);
    expect(await verifyProtection({ ticket: challenge.ticket, website: '', turnstileToken: 'test-token' }, draft)).toMatchObject({ method: 'turnstile' });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ secret: 'unit-test-private-secret-key', response: 'test-token' });
  });
  it.each([
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, hostname: 'attacker.invalid', action: BOT_ACTION },
    { success: true, hostname: 'localhost', action: 'other-form' },
    { success: true, hostname: 'localhost', action: BOT_ACTION, cdata: 'different-browser' },
  ])('rejects failed, replayed and mismatched provider results %#', async result => {
    enhanced();
    const challenge = await issueProtection(draft, oldDraft());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(result)));
    await expect(verifyProtection({ ticket: challenge.ticket, website: '', turnstileToken: 'test-token' }, draft)).rejects.toMatchObject({ status: 403 });
  });
  it('fails closed if the provider is unavailable', async () => {
    enhanced();
    const challenge = await issueProtection(draft, oldDraft());
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private network error')));
    await expect(verifyProtection({ ticket: challenge.ticket, website: '', turnstileToken: 'test-token' }, draft)).rejects.toMatchObject({ status: 503, code: 'SECURITY_CHECK_UNAVAILABLE' });
  });
  it('requires a provider token for a new response and permits receipt-only retries', async () => {
    enhanced();
    const challenge = await issueProtection(draft, oldDraft());
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(verifyProtection({ ticket: challenge.ticket, website: '' }, draft)).rejects.toMatchObject({ status: 403 });
    await expect(verifyProtection({ ticket: challenge.ticket, website: '' }, draft, true)).resolves.toMatchObject({ method: 'turnstile' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
