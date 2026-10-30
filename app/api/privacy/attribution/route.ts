import { assertSameOrigin,json,readJson,route } from '@/lib/http';
import { campaignSchema } from '@/lib/privacy-schema';
import { captureAttribution } from '@/lib/privacy-service';
import { rateLimit } from '@/lib/rate-limit';
export const POST=route(async request=>{assertSameOrigin(request);const input=await readJson(request,campaignSchema);await rateLimit('attribution-global','all',3000);return json(await captureAttribution(input));});
