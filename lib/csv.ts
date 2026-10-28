import { questions, displayAnswer, type Answers, type Question } from './survey-schema';
export function csvCell(value: unknown) {
  let text = value == null ? '' : String(value);
  // Also guard leading control characters / whitespace before a formula prefix.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function responsesCsv(rows: { receipt: string; surveyVersion: string; consent: boolean; submittedAt: Date; responses: Answers; questionSnapshot?: Question[] }[]) {
  const header = ['Response reference', 'Survey version', 'Submitted at (UTC)', 'Optional consent', ...questions.map(q => `Q${q.number}. ${q.prompt}`)];
  const lines = rows.map(r => [r.receipt, r.surveyVersion, r.submittedAt.toISOString(), r.consent, ...questions.map(q => {
    const historic = r.questionSnapshot?.find(h => h.id === q.id);
    const a = r.responses[q.id];
    if (!historic) return displayAnswer(q.id, a);
    return a?.text || a?.values?.map(v => historic.options.find(o => o.value === v)?.label === 'Other' ? `Other: ${a.other ?? ''}` : historic.options.find(o => o.value === v)?.label ?? v).join('; ') || '';
  })]);
  return '\uFEFF' + [header, ...lines].map(line => line.map(csvCell).join(',')).join('\r\n');
}
