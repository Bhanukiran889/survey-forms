import { route, assertSameOrigin, readJson, json } from '@/lib/http';
import { protectedSubmissionSchema } from '@/lib/validation';
import { draftCredential, loadDraft, submitSurvey } from '@/lib/survey-service';
import { rateLimit } from '@/lib/rate-limit';
import { verifyProtection } from '@/lib/bot-protection';
export const runtime = 'nodejs';
export const POST = route(async request => {
  assertSameOrigin(request); const { protection, ...data } = await readJson(request, protectedSubmissionSchema);
  const credential = await draftCredential();
  await rateLimit('submit', credential.id, 10); await rateLimit('submit-global', 'all', 1000);
  const draft = await loadDraft('current');
  const verification = await verifyProtection(protection, credential, !!draft.submittedAt);
  if (draft.submittedAt && draft.receipt && draft.withdrawalKey) return json({ receipt: draft.receipt, withdrawalKey: draft.withdrawalKey, duplicate: true });
  const result = await submitSurvey(data, verification); return json(result, result.duplicate ? 200 : 201);
});
