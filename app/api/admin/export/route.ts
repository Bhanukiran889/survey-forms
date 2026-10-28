import { route } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { responseQuery } from '@/lib/responses';
import { responsesCsv } from '@/lib/csv';
import { rateLimit } from '@/lib/rate-limit';
import type { SurveyResponse } from '@/models/survey-response';
export const GET = route(async request => {
  const admin = await requireAdmin(); await rateLimit('export', admin.id, 30);
  const { query, filter } = responseQuery(request.url); const collection = (await getDb()).collection<SurveyResponse>('survey_responses');
  const [rows, count] = await Promise.all([collection.find(filter).sort({ submittedAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).toArray(), collection.countDocuments(filter)]);
  return new Response(responsesCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="recallmd-responses-page-${query.page}.csv"`, 'Cache-Control': 'no-store', 'X-Total-Count': String(count), 'X-Total-Pages': String(Math.ceil(count / query.limit)), 'X-Export-Page': String(query.page) } });
});
