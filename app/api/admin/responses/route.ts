import { route, json } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { responseQuery } from '@/lib/responses';
import type { SurveyResponse } from '@/models/survey-response';
export const GET = route(async request => {
  await requireAdmin(); const { query, filter } = responseQuery(request.url); const collection = (await getDb()).collection<SurveyResponse>('survey_responses');
  const [rows, total] = await Promise.all([
    collection.find(filter, { projection: { receipt: 1, preparationStage: 1, recallFrequency: 1, productUsefulness: 1, surveyVersion: 1, submittedAt: 1, consent: 1 } }).sort({ submittedAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(),
    collection.countDocuments(filter),
  ]);
  return json({ rows, total, page: query.page, limit: query.limit, pages: Math.ceil(total / query.limit) });
});
