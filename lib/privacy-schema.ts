import { z } from 'zod';
export const POLICY_VERSION = '2026-10-30';
export const OFFER_VERSION = 'subscription-2026-10-30';
export const EARLY_ACCESS_OFFER = 'When RecallMD becomes available, we will offer free subscriptions to selected survey participants who provide genuine, thoughtful, and relevant answers. Honest criticism is welcome. Selection considers response completeness, relevance, a range of preparation stages, and available capacity; not everyone will be selected. Leaving an email is optional and only lets us contact you about selection and the free subscription. The subscription duration, included features, and availability will be explained in the invitation before you choose to join. No purchase is required, and no paid subscription starts automatically.';
export const PREFERENCE_DAYS = 180;
export const ATTRIBUTION_DAYS = 30;
const tag = z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9 _./-]+$/, 'Use campaign labels only; personal information is not allowed.');
export const campaignSchema = z.object({ source: tag.optional(), medium: tag.optional(), campaign: tag.optional(), term: tag.optional(), content: tag.optional() }).strict().refine(v => Object.values(v).some(Boolean), { message: 'At least one campaign label is required.' });
export type Campaign = z.infer<typeof campaignSchema>;
export type CampaignTouch = Campaign & { capturedAt: Date };
export type Attribution = { firstTouch: CampaignTouch; lastTouch: CampaignTouch; consentedAt: Date; policyVersion: string };
export const preferenceSchema = z.object({ analytics: z.boolean(), policyVersion: z.literal(POLICY_VERSION), campaign: campaignSchema.optional() }).strict().refine(v => v.analytics || !v.campaign, { message: 'Attribution requires optional-cookie consent.' });
export function campaignFromSearch(search: string): Campaign | undefined {
 const params = new URLSearchParams(search); const result: Record<string,string> = {};
 for (const key of ['source','medium','campaign','term','content']) { const value=params.get(`utm_${key}`)?.trim(); if (value && tag.safeParse(value).success) result[key]=value; }
 return Object.keys(result).length ? result : undefined;
}
