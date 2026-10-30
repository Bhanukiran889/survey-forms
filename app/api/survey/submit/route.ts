import { route, assertSameOrigin, readJson, json } from '@/lib/http';
import { finalSubmissionSchema } from '@/lib/validation';
import { draftCredential, submitSurvey } from '@/lib/survey-service';
import { rateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export const POST = route(async request => {
  assertSameOrigin(request); const data = await readJson(request, finalSubmissionSchema);
  const credential = await draftCredential();
  await rateLimit('submit', credential.id, 10); await rateLimit('submit-global', 'all', 1000);
  const result = await submitSurvey(data); return json(result, result.duplicate ? 200 : 201);
});
