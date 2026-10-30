import { assertSameOrigin,json,readJson,route } from '@/lib/http';
import { preferenceSchema,POLICY_VERSION } from '@/lib/privacy-schema';
import { getPreference,savePreference } from '@/lib/privacy-service';
import { rateLimit } from '@/lib/rate-limit';
export const GET=route(async()=>{const pref=await getPreference();return json(pref?{decided:true,analytics:pref.analytics,policyVersion:pref.policyVersion,updatedAt:pref.updatedAt}:{decided:false,analytics:false,policyVersion:POLICY_VERSION});});
export const POST=route(async request=>{assertSameOrigin(request);const input=await readJson(request,preferenceSchema);await rateLimit('cookie-preferences-global','all',2000);return json(await savePreference(input.analytics,input.campaign));});
