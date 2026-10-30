import type { ObjectId } from 'mongodb';
import type { Attribution, CampaignTouch } from '@/lib/privacy-schema';
export interface PrivacyPreference { _id?:ObjectId; preferenceId:string; credentialHash:string; analytics:boolean; policyVersion:string; consentedAt:Date; createdAt:Date; updatedAt:Date; expiresAt:Date; lastCaptureAt?:Date; }
export interface CampaignAttribution { _id?:ObjectId; preferenceId:string; firstTouch:CampaignTouch; lastTouch:CampaignTouch; createdAt:Date; expiresAt:Date; }
export interface ConsentEvent { _id?:ObjectId; preferenceId?:string; receipt?:string; type:'cookie_choice'|'survey_submission'|'email_withdrawal'; policyVersion:string; analytics?:boolean; participation?:boolean; termsAccepted?:boolean; privacyAcknowledged?:boolean; emailOptIn?:boolean; offerVersion?:string; recordedAt:Date; expiresAt:Date; }
export interface ContactRecord { _id?:ObjectId; submissionToken:string; receipt:string; emailCiphertext:string; emailHash:string; status:'pending_review'|'selected'|'declined'; offerVersion:string; offerTerms:string; policyVersion:string; optedInAt:Date; createdAt:Date; updatedAt:Date; expiresAt:Date; }
export interface DraftContact { _id?:ObjectId; anonymousSessionId:string; emailCiphertext:string; updatedAt:Date; expiresAt:Date; }
export type { Attribution };
