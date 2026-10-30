import { z } from 'zod';
import { questions, questionById, SURVEY_VERSION, type Answers } from './survey-schema';
import { botProofSchema } from './bot-contract';

const answerSchema = z.object({ values: z.array(z.string().max(80)).max(20).optional(), other: z.string().trim().max(500).optional(), text: z.string().trim().max(4000).optional() }).strict();
export function validateAnswers(answers: Answers, complete: boolean) {
  const errors: Record<string, string> = {};
  for (const id of Object.keys(answers)) if (!Object.hasOwn(questionById, id)) errors[id] = 'Unknown question.';
  for (const q of questions) {
    const a = answers[q.id];
    if (!a) { if (complete && q.required) errors[q.id] = 'Please answer this question.'; continue; }
    if (q.type === 'text') { if (a.values?.length || a.other) errors[q.id] = 'Please provide a text response.'; continue; }
    const values = a.values ?? [];
    if (a.text) errors[q.id] = 'Please choose one of the available answers.';
    if (complete && q.required && !values.length) errors[q.id] = 'Please select an answer.';
    if (q.type === 'single' && values.length > 1) errors[q.id] = 'Select one answer.';
    if (q.maxSelections && values.length > q.maxSelections) errors[q.id] = `Choose up to ${q.maxSelections} options.`;
    if (new Set(values).size !== values.length || values.some(v => !q.options.some(o => o.value === v))) errors[q.id] = 'One or more selections are invalid.';
    const hasOther = values.some(v => q.options.find(o => o.value === v)?.label === 'Other');
    if (complete && hasOther && !a.other?.trim()) errors[q.id] = 'Please tell us a little more about your other answer.';
    if (a.other && !hasOther) errors[q.id] = 'Other text requires selecting Other.';
    // These answers describe mutually exclusive situations in the question bank.
    const exclusive = q.options.find(o => ['I do not experience this regularly', 'No dedicated revision tool', 'I am generally satisfied with my current system', 'Nothing specific'].includes(o.label));
    if (exclusive && values.includes(exclusive.value) && values.length > 1) errors[q.id] = 'This answer cannot be combined with other selections.';
  }
  return errors;
}
export const answersSchema = z.record(z.string().max(10), answerSchema);
function refineAnswers(complete: boolean) { return (answers: Answers, ctx: z.RefinementCtx) => { for (const [id, message] of Object.entries(validateAnswers(answers, complete))) ctx.addIssue({ code: 'custom', path: [id], message }); }; }
const extraFields = {
 termsAccepted: z.boolean().optional(), privacyAcknowledged: z.boolean().optional(),
 emailOptIn: z.boolean().optional(), email: z.string().trim().max(254).optional(),
};
export const draftSchema = z.object({ surveyVersion: z.literal(SURVEY_VERSION), responses: answersSchema.superRefine(refineAnswers(false)), currentSection: z.number().int().min(0).max(6), consent: z.boolean(), ...extraFields }).strict();
export const submissionSchema = z.object({ surveyVersion: z.literal(SURVEY_VERSION), responses: answersSchema.superRefine(refineAnswers(true)), consent: z.boolean(), ...extraFields }).strict();
export const finalSubmissionSchema = submissionSchema.superRefine((value,ctx)=>{
 if(!value.termsAccepted) ctx.addIssue({code:'custom',path:['termsAccepted'],message:'Please accept the participation terms.'});
 if(!value.privacyAcknowledged) ctx.addIssue({code:'custom',path:['privacyAcknowledged'],message:'Please confirm you have read the privacy notice.'});
 if(value.emailOptIn && !z.email().safeParse(value.email).success) ctx.addIssue({code:'custom',path:['email'],message:'Enter an email for free subscription selection, or turn off the optional opt-in.'});
 if(!value.emailOptIn && value.email) ctx.addIssue({code:'custom',path:['emailOptIn'],message:'Please opt in before providing an email.'});
});
export const protectedSubmissionSchema = finalSubmissionSchema.safeExtend({ protection: botProofSchema });
export type Submission = z.infer<typeof submissionSchema>;
export const loginSchema = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(256) }).strict();
export const withdrawalSchema = z.object({ receipt: z.string().uuid(), key: z.string().regex(/^[a-f0-9]{64}$/), action: z.enum(['response','email']).optional() }).strict();
export const querySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), stage: z.string().max(80).optional(), version: z.string().max(30).optional(), search: z.string().max(100).optional(), from: z.iso.date().optional(), to: z.iso.date().optional() }).refine(v => !v.from || !v.to || v.from <= v.to, { message: 'The end date must follow the start date.' });
