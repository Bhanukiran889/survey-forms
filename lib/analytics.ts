import 'server-only';
import { getDb } from './mongodb';
import { answerLabel, SURVEY_VERSION } from './survey-schema';
export type ChartDatum = { name: string; value: number };
export type Analytics = { total: number; drafts: number; completionRate: number | null; topStage: string | null; topRecall: string | null; version: string; charts: Record<string, ChartDatum[]>; };
import { chartDefinitions } from './analytics-config';
export async function getAnalytics(): Promise<Analytics> {
  const db = await getDb(); const now = new Date();
  // Versions stay separate so changing wording cannot silently merge distinct studies.
  const match = { status: 'submitted', surveyVersion: SURVEY_VERSION, expiresAt: { $gt: now } };
  const facets = Object.fromEntries(chartDefinitions.map(def => [def.id, [ ...(def.multi ? [{ $unwind: `$${def.field}` }] : []), { $group: { _id: `$${def.field}`, value: { $sum: 1 } } }, { $sort: { value: -1, _id: 1 } } ]]));
  const [rows, total, drafts] = await Promise.all([
    db.collection('survey_responses').aggregate<{ [key: string]: { _id: string; value: number }[] }>([{ $match: match }, { $facet: { ...facets, timeline: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt', timezone: 'Asia/Kolkata' } }, value: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 30 }, { $sort: { _id: 1 } }] } }], { maxTimeMS: 10000 }).toArray(),
    db.collection('survey_responses').countDocuments(match),
    db.collection('survey_drafts').aggregate<{ count: number }>([
      { $match: { submittedAt: { $exists: false }, surveyVersion: SURVEY_VERSION, expiresAt: { $gt: now } } },
      { $lookup: { from: 'survey_responses', localField: 'anonymousSessionId', foreignField: 'submissionToken', as: 'submittedResponse' } },
      { $match: { 'submittedResponse.0': { $exists: false } } },
      { $count: 'count' },
    ], { maxTimeMS: 10000 }).toArray().then(rows => rows[0]?.count ?? 0),
  ]);
  const result = rows[0] ?? {}; const charts: Record<string, ChartDatum[]> = {};
  for (const def of chartDefinitions) charts[def.id] = (result[def.id] ?? []).filter(r => r._id).map(r => ({ name: answerLabel(def.question, r._id), value: r.value }));
  charts.timeline = (result.timeline ?? []).map(r => ({ name: r._id, value: r.value }));
  return { total, drafts, completionRate: total + drafts ? Math.round(100 * total / (total + drafts)) : null, topStage: charts.stages[0]?.name ?? null, topRecall: charts.recall[0]?.name ?? null, version: SURVEY_VERSION, charts };
}
