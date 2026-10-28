import { route, readJson, assertSameOrigin, json } from '@/lib/http';
import { draftSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { draftCredential, saveDraft } from '@/lib/survey-service';
export const runtime = 'nodejs';
export const POST = route(async request => {
  assertSameOrigin(request); const data = await readJson(request, draftSchema);
  await rateLimit('draft-global', 'all', 2000);
  const credential = await draftCredential(true); await rateLimit('draft', credential.id, 180);
  return json(await saveDraft(data));
});
