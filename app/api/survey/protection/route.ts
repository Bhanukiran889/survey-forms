import { z } from 'zod';
import { assertSameOrigin, json, readJson, route } from '@/lib/http';
import { draftCredential, loadDraft } from '@/lib/survey-service';
import { rateLimit } from '@/lib/rate-limit';
import { issueProtection } from '@/lib/bot-protection';

export const runtime = 'nodejs';
export const POST = route(async request => {
  assertSameOrigin(request);
  await readJson(request, z.object({}).strict());
  const credential = await draftCredential();
  await rateLimit('protection', credential.id, 30);
  await rateLimit('protection-global', 'all', 3000);
  const draft = await loadDraft('current');
  return json(await issueProtection(credential, draft.createdAt));
});
