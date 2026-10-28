import { route, assertSameOrigin, readJson, json, HttpError } from '@/lib/http';
import { withdrawalSchema } from '@/lib/validation';
import { getDb } from '@/lib/mongodb';
import { hashToken } from '@/lib/crypto';
import { rateLimit } from '@/lib/rate-limit';
import type { SurveyResponse } from '@/models/survey-response';
export const runtime = 'nodejs';
export const POST = route(async request => {
  assertSameOrigin(request); const data = await readJson(request, withdrawalSchema);
  await rateLimit('withdraw-global', 'all', 100);
  const db = await getDb();
  const removed = await db.collection<SurveyResponse>('survey_responses').findOneAndDelete({ receipt: data.receipt, withdrawalHash: hashToken(data.key) });
  if (!removed) throw new HttpError(404, 'NOT_FOUND', 'No response matches these withdrawal details. It may already have been deleted.');
  await db.collection('survey_drafts').deleteOne({ anonymousSessionId: removed.submissionToken });
  return json({ deleted: true });
});
