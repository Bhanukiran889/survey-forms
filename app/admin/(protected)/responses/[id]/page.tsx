import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ObjectId } from 'mongodb';
import { requireAdminPage } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import type { SurveyResponse } from '@/models/survey-response';
import { formatDate } from '@/lib/utils';
export const metadata = { title: 'Response detail' };
export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
 await requireAdminPage(); const { id } = await params;
 if (!/^[a-f0-9]{24}$/.test(id)) notFound();
 const r = await (await getDb()).collection<SurveyResponse>('survey_responses').findOne({ _id: new ObjectId(id), status: 'submitted', expiresAt: { $gt: new Date() } }, { projection: { submissionToken: 0, withdrawalHash: 0 } });
 if (!r) notFound();
 return <><Link className="text-link detail-back" href="/admin/responses"><ArrowLeft size={14}/> All responses</Link><div className="admin-page-heading"><div><span className="eyebrow">A STUDENT’S PERSPECTIVE</span><h1>Response {r.receipt.slice(0,8)}<span className="heading-dot">.</span></h1><p>Anonymous research response · Survey v{r.surveyVersion}</p></div><span className="submitted-badge"><CheckCircle2 size={14}/> Submitted</span></div><div className="response-detail-meta"><span><CalendarDays size={15}/>{formatDate(r.submittedAt)} · {new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(r.submittedAt)} IST</span><span><ShieldCheck size={15}/>Voluntary participation confirmation: {r.consent ? 'Checked' : 'Unchecked'}</span></div><div className="response-detail-meta"><span>Terms: {r.termsAccepted ? 'Accepted' : 'Legacy response'}</span><span>Privacy: {r.privacyAcknowledged ? 'Acknowledged' : 'Legacy response'}</span><span>Notice version: {r.policyVersion ?? 'Before versioned notices'}</span><span>Email invitation opt-in: {r.emailOptIn ? 'Yes · see restricted contacts' : 'No'}</span><span>Consented source: {r.attribution?.firstTouch.source ?? 'Not collected'}</span><span>Consented campaign: {r.attribution?.firstTouch.campaign ?? 'Not collected'}</span></div><div className="response-detail-answers">{r.questionSnapshot.map(q => { const a = r.responses[q.id]; const text = a?.text || a?.values?.map(v => { const option = q.options.find(o => o.value === v); return option?.label === 'Other' ? `Other: ${a.other ?? ''}` : option?.label ?? v; }).join('; ') || 'Not answered'; return <article key={q.id}><span className="question-number">{String(q.number).padStart(2,'0')}</span><div><h2>{q.prompt}</h2><p>{text}</p></div></article>; })}</div></>;
}
