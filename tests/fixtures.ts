import { questions, SURVEY_VERSION } from '@/lib/survey-schema';
import type { Submission } from '@/lib/validation';
export function validSubmission(): Submission { return { surveyVersion: SURVEY_VERSION, consent: true, responses: Object.fromEntries(questions.filter(q => q.required).map(q => [q.id, { values: [q.options[0].value] }])) }; }
