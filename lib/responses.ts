import 'server-only';
import type { Filter } from 'mongodb';
import { querySchema } from './validation';
import type { SurveyResponse } from '@/models/survey-response';
export function responseQuery(url: string) {
  const raw = Object.fromEntries(new URL(url).searchParams); const query = querySchema.parse(raw);
  const filter: Filter<SurveyResponse> = { status: 'submitted', expiresAt: { $gt: new Date() } };
  if (query.stage) filter.preparationStage = query.stage;
  if (query.version) filter.surveyVersion = query.version;
  if (query.from || query.to) filter.submittedAt = { ...(query.from ? { $gte: new Date(`${query.from}T00:00:00+05:30`) } : {}), ...(query.to ? { $lt: new Date(new Date(`${query.to}T00:00:00+05:30`).getTime() + 86400000) } : {}) };
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ receipt: { $regex: escaped, $options: 'i' } }, { 'responses.q9.text': { $regex: escaped, $options: 'i' } }, ...['q26', 'q27', 'q28'].map(q => ({ [`responses.${q}.text`]: { $regex: escaped, $options: 'i' } }))];
  }
  return { query, filter };
}
