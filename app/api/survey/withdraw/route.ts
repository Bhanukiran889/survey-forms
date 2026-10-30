import { route,assertSameOrigin,readJson,json,HttpError } from '@/lib/http';
import { withdrawalSchema } from '@/lib/validation';
import { withDatabaseTransaction } from '@/lib/mongodb';
import { POLICY_VERSION } from '@/lib/privacy-schema';
import { hashToken } from '@/lib/crypto';
import { rateLimit } from '@/lib/rate-limit';
import type { SurveyResponse } from '@/models/survey-response';
export const runtime='nodejs';
export const POST=route(async request=>{
 assertSameOrigin(request);const data=await readJson(request,withdrawalSchema);await rateLimit('withdraw-global','all',100);
 return withDatabaseTransaction(async(db,session)=>{
  const filter={receipt:data.receipt,withdrawalHash:hashToken(data.key),expiresAt:{$gt:new Date()}};
  const response=await db.collection<SurveyResponse>('survey_responses').findOne(filter,{session});
  if(!response)throw new HttpError(404,'NOT_FOUND','No response matches these private details. It may already have expired or been deleted.');
  await db.collection('early_access_contacts').deleteOne({receipt:data.receipt},{session});
  await db.collection('survey_draft_contacts').deleteOne({anonymousSessionId:response.submissionToken},{session});
  if(data.action==='email'){
   await db.collection<SurveyResponse>('survey_responses').updateOne(filter,{$set:{emailOptIn:false,updatedAt:new Date()}},{session});
   await db.collection('consent_events').insertOne({receipt:data.receipt,type:'email_withdrawal',emailOptIn:false,policyVersion:POLICY_VERSION,recordedAt:new Date(),expiresAt:response.expiresAt},{session});
   return json({deleted:true,emailOnly:true});
  }
  await db.collection<SurveyResponse>('survey_responses').deleteOne(filter,{session});
  await db.collection('survey_drafts').deleteOne({anonymousSessionId:response.submissionToken},{session});
  await db.collection('consent_events').deleteMany({receipt:data.receipt},{session});
  return json({deleted:true,emailOnly:false});
 });
});
