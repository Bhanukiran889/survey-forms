import 'server-only';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import type { ClientSession, Db } from 'mongodb';
import { getDb, withDatabaseTransaction } from './mongodb';
import { hashToken, randomToken } from './crypto';
import { cookieOptions } from './auth';
import { HttpError } from './http';
import { ATTRIBUTION_DAYS, PREFERENCE_DAYS, POLICY_VERSION, type Attribution, type Campaign } from './privacy-schema';
import type { CampaignAttribution, ConsentEvent, PrivacyPreference } from '@/models/privacy';
const COOKIE='recallmd_privacy';
async function credential(create=false) {
 const jar=await cookies(); const raw=jar.get(COOKIE)?.value;
 if(raw&&/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(raw)) { const [id,secret]=raw.split('.'); return {preferenceId:id,credentialHash:hashToken(secret)}; }
 if(!create)return null;
 const preferenceId=randomUUID(),secret=randomToken();
 jar.set(COOKIE,`${preferenceId}.${secret}`,{...cookieOptions,maxAge:PREFERENCE_DAYS*86400});
 return {preferenceId,credentialHash:hashToken(secret)};
}
export async function getPreference(db?:Db,session?:ClientSession) {
 const auth=await credential(); if(!auth)return null;
 return (db??await getDb()).collection<PrivacyPreference>('privacy_preferences').findOne({...auth,expiresAt:{$gt:new Date()},policyVersion:POLICY_VERSION},{session});
}
async function writeAttribution(db:Db,session:ClientSession,pref:PrivacyPreference,campaign:Campaign) {
 // Taking a write lock on the preference makes revocation and capture serialize.
 if(!pref.analytics)throw new HttpError(403,'TRACKING_NOT_ALLOWED','Optional campaign cookies have not been accepted.');
 const now=new Date(); await db.collection<PrivacyPreference>('privacy_preferences').updateOne({_id:pref._id},{$set:{lastCaptureAt:now}},{session});
 const col=db.collection<CampaignAttribution>('campaign_attribution');
 const previous=await col.findOne({preferenceId:pref.preferenceId,expiresAt:{$gt:now}},{session});
 const touch={...campaign,capturedAt:now};
 await col.updateOne({preferenceId:pref.preferenceId},{$set:{lastTouch:touch,...(!previous?{firstTouch:touch,createdAt:now,expiresAt:new Date(Date.now()+ATTRIBUTION_DAYS*86400000)}:{})}},{session,upsert:true});
}
export async function savePreference(analytics:boolean,campaign?:Campaign) {
 const auth=(await credential(true))!;
 const result=await withDatabaseTransaction(async(db,session)=>{
  const now=new Date(); const expiresAt=new Date(Date.now()+PREFERENCE_DAYS*86400000);
  const pref=await db.collection<PrivacyPreference>('privacy_preferences').findOneAndUpdate(auth,{$set:{analytics,policyVersion:POLICY_VERSION,consentedAt:now,updatedAt:now,expiresAt},$setOnInsert:{...auth,createdAt:now}},{upsert:true,returnDocument:'after',session});
  await db.collection<ConsentEvent>('consent_events').insertOne({preferenceId:auth.preferenceId,type:'cookie_choice',analytics,policyVersion:POLICY_VERSION,recordedAt:now,expiresAt},{session});
  if(!analytics){
   await db.collection('campaign_attribution').deleteOne({preferenceId:auth.preferenceId},{session});
   await db.collection('survey_responses').updateMany({privacyPreferenceId:auth.preferenceId},{$unset:{attribution:'',privacyPreferenceId:''}},{session});
  } else if(campaign&&pref) await writeAttribution(db,session,pref,campaign);
  return {decided:true,analytics,policyVersion:POLICY_VERSION,updatedAt:now.toISOString()};
 });
 const jar=await cookies(); const current=jar.get(COOKIE)?.value;
 if(current)jar.set(COOKIE,current,{...cookieOptions,maxAge:PREFERENCE_DAYS*86400});
 return result;
}
export async function captureAttribution(campaign:Campaign) {
 return withDatabaseTransaction(async(db,session)=>{const pref=await getPreference(db,session);if(!pref)throw new HttpError(403,'TRACKING_NOT_ALLOWED','Please choose your cookie preferences first.');await writeAttribution(db,session,pref,campaign);return {captured:true};});
}
export async function submissionAttribution(db:Db,session:ClientSession):Promise<{privacyPreferenceId:string;attribution:Attribution}|undefined> {
 const pref=await getPreference(db,session);if(!pref?.analytics)return undefined;
 const record=await db.collection<CampaignAttribution>('campaign_attribution').findOne({preferenceId:pref.preferenceId,expiresAt:{$gt:new Date()}},{session});if(!record)return undefined;
 await db.collection<PrivacyPreference>('privacy_preferences').updateOne({_id:pref._id},{$set:{lastCaptureAt:new Date()}},{session});
 return {privacyPreferenceId:pref.preferenceId,attribution:{firstTouch:record.firstTouch,lastTouch:record.lastTouch,consentedAt:pref.consentedAt,policyVersion:pref.policyVersion}};
}
