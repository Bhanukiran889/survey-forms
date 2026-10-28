import { json, handleError } from '@/lib/http';
import { loadDraft } from '@/lib/survey-service';
export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const draft = await loadDraft((await context.params).id);
    return json({ id: draft.anonymousSessionId, surveyVersion: draft.surveyVersion, responses: draft.responses, currentSection: draft.currentSection, consent: draft.consent, savedAt: draft.updatedAt, submitted: !!draft.submittedAt });
  } catch (error) { return handleError(error); }
}
