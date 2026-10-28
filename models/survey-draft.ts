import type { ObjectId } from 'mongodb';
import type { Answers } from '@/lib/survey-schema';
export interface SurveyDraft { _id?: ObjectId; anonymousSessionId: string; credentialHash: string; surveyVersion: string; responses: Answers; currentSection: number; consent: boolean; createdAt: Date; updatedAt: Date; expiresAt: Date; submittedAt?: Date; }
