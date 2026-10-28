import 'server-only';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { MongoServerError } from 'mongodb';
import { getDb } from './mongodb';
import { randomToken, hashToken } from './crypto';
import { cookieOptions } from './auth';
import { HttpError } from './http';
import { DRAFT_RETENTION_DAYS, SURVEY_VERSION, questions } from './survey-schema';
import { responseRetentionDays } from './env';
import type { Submission } from './validation';
import type { SurveyDraft } from '@/models/survey-draft';
import type { SurveyResponse } from '@/models/survey-response';
const DRAFT_COOKIE = 'recallmd_draft';
export async function draftCredential(create = false) {
  const jar = await cookies(); const raw = jar.get(DRAFT_COOKIE)?.value;
  if (raw && /^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(raw)) { const [id, secret] = raw.split('.'); return { id, credentialHash: hashToken(secret) }; }
  if (!create) throw new HttpError(401, 'DRAFT_CREDENTIAL_REQUIRED', 'Your saved survey could not be opened. Please start a new survey.');
  const id = randomUUID(), secret = randomToken();
  jar.set(DRAFT_COOKIE, `${id}.${secret}`, { ...cookieOptions, maxAge: DRAFT_RETENTION_DAYS * 86400 });
  return { id, credentialHash: hashToken(secret) };
}
export async function loadDraft(id: string) {
  const credential = await draftCredential();
  if (id !== credential.id && id !== 'current') throw new HttpError(404, 'DRAFT_NOT_FOUND', 'This saved survey is not available.');
  const draft = await (await getDb()).collection<SurveyDraft>('survey_drafts').findOne({ anonymousSessionId: credential.id, credentialHash: credential.credentialHash, expiresAt: { $gt: new Date() } });
  if (!draft) throw new HttpError(404, 'DRAFT_NOT_FOUND', 'There is no saved survey on this browser.');
  return draft;
}
export async function saveDraft(data: { responses: Submission['responses']; currentSection: number; surveyVersion: string; consent: boolean }) {
  const credential = await draftCredential(true); const now = new Date();
  const db = await getDb(); const drafts = db.collection<SurveyDraft>('survey_drafts');
  const previous = await drafts.findOne({ anonymousSessionId: credential.id });
  if (previous?.submittedAt) throw new HttpError(409, 'ALREADY_SUBMITTED', 'This survey has already been submitted.');
  await drafts.updateOne({ anonymousSessionId: credential.id, credentialHash: credential.credentialHash }, { $set: { ...data, updatedAt: now, expiresAt: new Date(Date.now() + DRAFT_RETENTION_DAYS * 86400000) }, $setOnInsert: { anonymousSessionId: credential.id, credentialHash: credential.credentialHash, createdAt: now } }, { upsert: true });
  return { id: credential.id, savedAt: now.toISOString(), expiresInDays: DRAFT_RETENTION_DAYS };
}
export async function submitSurvey(data: Submission) {
  const credential = await draftCredential(); const db = await getDb();
  const draft = await loadDraft(credential.id);
  if (draft.surveyVersion !== SURVEY_VERSION) throw new HttpError(409, 'VERSION_CHANGED', 'The survey has changed. Please start a new survey.');
  const responses = db.collection<SurveyResponse>('survey_responses');
  const withdrawalKey = hashToken(`withdraw:${credential.credentialHash}:${credential.id}`);
  const prior = await responses.findOne({ submissionToken: credential.id }, { projection: { receipt: 1 } });
  if (prior) {
    await db.collection<SurveyDraft>('survey_drafts').updateOne({ anonymousSessionId: credential.id }, { $set: { submittedAt: new Date(), responses: {}, updatedAt: new Date() } });
    return { receipt: prior.receipt, withdrawalKey, duplicate: true };
  }
  // Withdrawal key is derived from the high-entropy browser credential, so retries
  // return the same key without storing a retrievable secret in MongoDB.
  const now = new Date(); const receipt = randomUUID();
  const first = (id: string) => data.responses[id]?.values?.[0] ?? '';
  const document: SurveyResponse = {
    surveyVersion: SURVEY_VERSION, status: 'submitted', responses: data.responses,
    questionSnapshot: questions, preparationStage: first('q5'), studyDuration: first('q2'),
    revisionMethod: data.responses.q13?.values ?? [], recallFrequency: first('q6'), productUsefulness: first('q20'), selectedFeatures: data.responses.q21?.values ?? [],
    consent: data.consent, createdAt: draft.createdAt, updatedAt: now, submittedAt: now,
    expiresAt: new Date(Date.now() + responseRetentionDays() * 86400000), submissionToken: credential.id,
    withdrawalHash: hashToken(withdrawalKey), receipt,
  };
  try { await responses.insertOne(document); }
  catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const existing = await responses.findOne({ submissionToken: credential.id });
      if (existing) return { receipt: existing.receipt, withdrawalKey, duplicate: true };
    }
    throw error;
  }
  // The unique response token makes retries safe even if this follow-up write fails.
  await db.collection<SurveyDraft>('survey_drafts').updateOne({ anonymousSessionId: credential.id }, { $set: { submittedAt: now, responses: {}, updatedAt: now } });
  return { receipt, withdrawalKey, duplicate: false };
}
