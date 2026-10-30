import 'server-only';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { MongoServerError } from 'mongodb';
import { getDb,withDatabaseTransaction } from './mongodb';
import { randomToken,hashToken } from './crypto';
import { encryptEmail,decryptEmail,emailHash } from './contact-crypto';
import { cookieOptions } from './auth';
import { HttpError } from './http';
import { DRAFT_RETENTION_DAYS,SURVEY_VERSION,questions } from './survey-schema';
import { responseRetentionDays } from './env';
import { EARLY_ACCESS_OFFER,OFFER_VERSION,POLICY_VERSION } from './privacy-schema';
import { submissionAttribution } from './privacy-service';
import type { Submission } from './validation';
import type { BotVerification } from './bot-contract';
import type { SurveyDraft } from '@/models/survey-draft';
import type { SurveyResponse } from '@/models/survey-response';
import type { ContactRecord,DraftContact,ConsentEvent } from '@/models/privacy';
const DRAFT_COOKIE='recallmd_draft';
export async function draftCredential(create=false) {
 const jar=await cookies();const raw=jar.get(DRAFT_COOKIE)?.value;
 if(raw&&/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(raw)){const[id,secret]=raw.split('.');return{id,credentialHash:hashToken(secret)};}
 if(!create)throw new HttpError(401,'DRAFT_CREDENTIAL_REQUIRED','Your saved survey could not be opened. Please start a new survey.');
 const id=randomUUID(),secret=randomToken();jar.set(DRAFT_COOKIE,`${id}.${secret}`,{...cookieOptions,maxAge:DRAFT_RETENTION_DAYS*86400});return{id,credentialHash:hashToken(secret)};
}
export async function loadDraft(id:string) {
 const auth=await draftCredential();if(id!==auth.id&&id!=='current')throw new HttpError(404,'DRAFT_NOT_FOUND','This saved survey is not available.');
 const db=await getDb();const draft=await db.collection<SurveyDraft>('survey_drafts').findOne({anonymousSessionId:auth.id,credentialHash:auth.credentialHash,expiresAt:{$gt:new Date()}});
 if(!draft)throw new HttpError(404,'DRAFT_NOT_FOUND','There is no saved survey on this browser.');
 const contact=draft.emailOptIn?await db.collection<DraftContact>('survey_draft_contacts').findOne({anonymousSessionId:auth.id,expiresAt:{$gt:new Date()}}):null;
 const submitted=draft.submittedAt?await db.collection<SurveyResponse>('survey_responses').findOne({submissionToken:auth.id,expiresAt:{$gt:new Date()}},{projection:{receipt:1}}):null;
 const withdrawalKey=submitted?hashToken(['withdraw',auth.credentialHash,auth.id].join(':')):undefined;
 return {...draft,email:contact?decryptEmail(contact.emailCiphertext):'',receipt:submitted?.receipt,withdrawalKey};
}
export async function saveDraft(data:Submission&{currentSection:number}) {
 const auth=await draftCredential(true);
 return withDatabaseTransaction(async(db,session)=>{
  const now=new Date(),expiresAt=new Date(Date.now()+DRAFT_RETENTION_DAYS*86400000);const drafts=db.collection<SurveyDraft>('survey_drafts');
  const previous=await drafts.findOne({anonymousSessionId:auth.id},{session});
  if(previous?.submittedAt)throw new HttpError(409,'ALREADY_SUBMITTED','This survey has already been submitted.');
  const {email,emailOptIn,...answers}=data;
  try{await drafts.updateOne({anonymousSessionId:auth.id,credentialHash:auth.credentialHash,submittedAt:{$exists:false}},{$set:{...answers,emailOptIn:!!emailOptIn,updatedAt:now,expiresAt},$setOnInsert:{anonymousSessionId:auth.id,credentialHash:auth.credentialHash,createdAt:now}},{upsert:true,session});}
  catch(error){if(error instanceof MongoServerError&&error.code===11000)throw new HttpError(409,'ALREADY_SUBMITTED','This survey is no longer editable.');throw error;}
  if(emailOptIn&&email)await db.collection<DraftContact>('survey_draft_contacts').updateOne({anonymousSessionId:auth.id},{$set:{emailCiphertext:encryptEmail(email),updatedAt:now,expiresAt}},{session,upsert:true});
  else await db.collection('survey_draft_contacts').deleteOne({anonymousSessionId:auth.id},{session});
  return{id:auth.id,savedAt:now.toISOString(),expiresInDays:DRAFT_RETENTION_DAYS};
 });
}
export async function submitSurvey(data:Submission, verification?:BotVerification) {
 const auth=await draftCredential();const withdrawalKey=hashToken(`withdraw:${auth.credentialHash}:${auth.id}`);
 try{return await withDatabaseTransaction(async(db,session)=>{
  const draft=await db.collection<SurveyDraft>('survey_drafts').findOne({anonymousSessionId:auth.id,credentialHash:auth.credentialHash,expiresAt:{$gt:new Date()}},{session});
  if(!draft)throw new HttpError(404,'DRAFT_NOT_FOUND','Your draft has expired. Please reopen the survey.');
  if(draft.surveyVersion!==SURVEY_VERSION)throw new HttpError(409,'VERSION_CHANGED','The survey version has changed. Please reopen it.');
  const responses=db.collection<SurveyResponse>('survey_responses');const prior=await responses.findOne({submissionToken:auth.id},{session,projection:{receipt:1}});
  if(prior)return{receipt:prior.receipt,withdrawalKey,duplicate:true};
  const now=new Date(),receipt=randomUUID(),expiresAt=new Date(Date.now()+responseRetentionDays()*86400000);
  const first=(id:string)=>data.responses[id]?.values?.[0]??'';
  const attribution=await submissionAttribution(db,session);
  const document:SurveyResponse={surveyVersion:SURVEY_VERSION,status:'submitted',responses:data.responses,questionSnapshot:questions,preparationStage:first('q5'),studyDuration:first('q2'),revisionMethod:data.responses.q13?.values??[],recallFrequency:first('q6'),productUsefulness:first('q20'),selectedFeatures:data.responses.q21?.values??[],consent:data.consent,termsAccepted:!!data.termsAccepted,privacyAcknowledged:!!data.privacyAcknowledged,emailOptIn:!!data.emailOptIn,policyVersion:POLICY_VERSION,consentRecordedAt:now,createdAt:draft.createdAt,updatedAt:now,submittedAt:now,expiresAt,submissionToken:auth.id,withdrawalHash:hashToken(withdrawalKey),receipt,...attribution};
  if(verification)document.botProtection=verification;
  await responses.insertOne(document,{session});
  if(data.emailOptIn&&data.email){const email=data.email.trim().toLowerCase();await db.collection<ContactRecord>('early_access_contacts').insertOne({submissionToken:auth.id,receipt,emailCiphertext:encryptEmail(email),emailHash:emailHash(email),status:'pending_review',offerVersion:OFFER_VERSION,offerTerms:EARLY_ACCESS_OFFER,policyVersion:POLICY_VERSION,optedInAt:now,createdAt:now,updatedAt:now,expiresAt},{session});}
  await db.collection<ConsentEvent>('consent_events').insertOne({receipt,type:'survey_submission',policyVersion:POLICY_VERSION,participation:data.consent,termsAccepted:!!data.termsAccepted,privacyAcknowledged:!!data.privacyAcknowledged,emailOptIn:!!data.emailOptIn,...(data.emailOptIn?{offerVersion:OFFER_VERSION}:{}),recordedAt:now,expiresAt},{session});
  await db.collection<SurveyDraft>('survey_drafts').updateOne({anonymousSessionId:auth.id},{$set:{submittedAt:now,responses:{},updatedAt:now}},{session});
  await db.collection('survey_draft_contacts').deleteOne({anonymousSessionId:auth.id},{session});
  return{receipt,withdrawalKey,duplicate:false};
 });}catch(error){
  if(error instanceof MongoServerError&&error.code===11000){const prior=await(await getDb()).collection<SurveyResponse>('survey_responses').findOne({submissionToken:auth.id},{projection:{receipt:1}});if(prior)return{receipt:prior.receipt,withdrawalKey,duplicate:true};}
  throw error;
 }
}
