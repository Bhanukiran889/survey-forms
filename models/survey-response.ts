import type { ObjectId } from 'mongodb';
import type { Answers, Question } from '@/lib/survey-schema';
export interface SurveyResponse {
  _id?: ObjectId; surveyVersion: string; status: 'submitted'; responses: Answers;
  questionSnapshot: Question[]; preparationStage: string; studyDuration: string;
  revisionMethod: string[]; recallFrequency: string; productUsefulness: string; selectedFeatures: string[];
  consent: boolean; createdAt: Date; updatedAt: Date; submittedAt: Date; expiresAt: Date;
  submissionToken: string; withdrawalHash: string; receipt: string;
}
