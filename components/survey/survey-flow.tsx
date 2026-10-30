'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Brain, CalendarDays, Check, CheckCircle2, ChevronRight, ClipboardCheck, Save, Download, Edit3, Heart, Layers3, LoaderCircle, LockKeyhole, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';
import { sections, sectionDescriptions, SURVEY_VERSION, displayAnswer, type Answers } from '@/lib/survey-schema';
import { finalSubmissionSchema, validateAnswers, type Submission } from '@/lib/validation';
import { api, ApiError, errorMessage } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { SubmissionOptions } from './submission-options';
import { QuestionCard } from './question-card';
import { WithdrawalForm } from './withdrawal-form';
const icons = [BookOpen, Brain, CalendarDays, Layers3, Sparkles, MessageSquareText];
type Receipt = { receipt: string; withdrawalKey?: string; duplicate?: boolean };
type Draft = { id: string; responses: Answers; currentSection: number; consent: boolean; surveyVersion: string; submitted: boolean; termsAccepted?: boolean; privacyAcknowledged?: boolean; emailOptIn?: boolean; email?: string; receipt?:string; withdrawalKey?:string };
export function SurveyFlow({ withdraw = false }: { withdraw?: boolean }) {
 const form = useForm<Submission>({ resolver: zodResolver(finalSubmissionSchema), defaultValues: { surveyVersion: SURVEY_VERSION, responses: {}, consent: false, termsAccepted: false, privacyAcknowledged: false, emailOptIn: false, email: '' }, mode: 'onSubmit' });
 const answers = useWatch({ control: form.control, name: 'responses' }) as Answers;
 const formValues = useWatch({ control: form.control }) as Submission;
 const [step, setStep] = useState(0), [ready, setReady] = useState(false), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false), [resumed, setResumed] = useState(false), [error, setError] = useState(''), [fieldErrors, setFieldErrors] = useState<Record<string,string>>({}), [submitting, setSubmitting] = useState(false), [receipt, setReceipt] = useState<Receipt | null>(null), [returnReview, setReturnReview] = useState(false);
 const saveQueue = useRef<Promise<unknown>>(Promise.resolve()); const surveyTop = useRef<HTMLDivElement>(null); const latestStep = useRef(step);
 const save = useCallback((data: Submission, currentSection: number) => {
  setSaving(true); setSaved(false);
  const task = saveQueue.current.catch(() => {}).then(() => api('/api/survey/draft', { method: 'POST', body: JSON.stringify({ ...data, currentSection }) }));
  saveQueue.current = task;
  task.then(() => { if (saveQueue.current === task) { setSaving(false); setSaved(true); setError(''); } }, e => { if (saveQueue.current === task) { setSaving(false); setError(errorMessage(e)); } });
  return task;
 }, []);
 useEffect(() => {
  if (withdraw) return;
  let active = true;
  (async () => {
   try {
    const draft = await api<Draft>('/api/survey/draft/current'); if (!active) return;
    if (draft.submitted) { setReceipt({ receipt: draft.receipt ?? 'Already submitted on this browser', withdrawalKey: draft.withdrawalKey, duplicate: true }); return; }
    if (draft.surveyVersion !== SURVEY_VERSION) { setError('The survey version has changed. Please clear the survey cookie to begin again.'); return; }
    form.reset({ surveyVersion: SURVEY_VERSION, responses: draft.responses, consent: draft.consent, termsAccepted: !!draft.termsAccepted, privacyAcknowledged: !!draft.privacyAcknowledged, emailOptIn: !!draft.emailOptIn, email: draft.email ?? '' }); setStep(draft.currentSection); latestStep.current = draft.currentSection; setResumed(Object.keys(draft.responses).length > 0); setSaved(true);
   } catch (e) {
    if (!active) return;
    if (e instanceof ApiError && [401,404].includes(e.status)) await save(form.getValues(), 0).catch(() => {});
    else setError(errorMessage(e));
   } finally { if (active) setReady(true); }
  })();
  return () => { active = false; };
 }, [form, save, withdraw]);
 useEffect(() => {
  if (!ready || receipt || withdraw || submitting) return;
  const unsubscribe = form.subscribe({ formState: { values: true }, callback: () => {
   setSaved(false); if (timer) clearTimeout(timer);
   timer = setTimeout(() => { save(form.getValues(), latestStep.current).catch(() => {}); }, 1200);
  } });
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => { unsubscribe(); if (timer) clearTimeout(timer); };
 }, [form, ready, receipt, save, withdraw, submitting]);
 const goTo = (next: number) => { latestStep.current = next; setStep(next); setFieldErrors({}); surveyTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); save(form.getValues(), next).catch(() => {}); };
 const next = () => {
  const errors = validateAnswers(form.getValues('responses'), true);
  const relevant = Object.fromEntries(Object.entries(errors).filter(([id]) => sections[step].questions.some(q => q.id === id)));
  setFieldErrors(relevant);
  if (Object.keys(relevant).length) { document.getElementById(Object.keys(relevant)[0])?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  goTo(returnReview ? 6 : step + 1); setReturnReview(false);
 };
 async function submit(data: Submission) {
  setSubmitting(true); setError('');
  try {
   await save(data, 6); const result = await api<Receipt>('/api/survey/submit', { method: 'POST', body: JSON.stringify(data) }); setReceipt(result); surveyTop.current?.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
   setError(errorMessage(e));
   if (e instanceof ApiError && e.fields) setFieldErrors(Object.fromEntries(e.fields.map(f => [f.path.split('.')[1], f.message])));
  } finally { setSubmitting(false); }
 }
 if (withdraw) return <div className="withdrawal-page container"><Link className="text-link" href="/"><ArrowLeft size={15}/> Back to home</Link><WithdrawalForm /></div>;
 if (receipt) return <div className="success-page container" ref={surveyTop}><div className="success-card"><div className="success-symbol"><CheckCircle2 size={38}/></div><span className="eyebrow">ONE PERSPECTIVE. A MEANINGFUL CONTRIBUTION.</span><h1>Thank you for<br />sharing your experience.</h1><p>{receipt.duplicate ? 'Your response has already been received. It is counted once in the research.' : 'Your response has been securely saved. You’ve helped us get a little closer to understanding what better revision could look like.'}</p>{receipt.withdrawalKey && <div className="receipt-box"><h3><ShieldCheck size={17}/> Your response and email, your control</h3><p>Save these private details to remove your optional email or withdraw your full response later.</p><span>Response reference</span><code>{receipt.receipt}</code><span>Private withdrawal key</span><code>{receipt.withdrawalKey}</code><Button variant="secondary" size="sm" onClick={() => { const blob = new Blob([`RecallMD withdrawal details\nResponse reference: ${receipt.receipt}\nPrivate withdrawal key: ${receipt.withdrawalKey}\nWithdraw at: ${window.location.origin}/survey?withdraw=1\nKeep these details private.`], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'recallmd-private-receipt.txt'; a.click(); URL.revokeObjectURL(url); }}><Download size={14}/> Save withdrawal details</Button></div>}<Button asChild><Link href="/">Return to home <ArrowRight size={16}/></Link></Button><Link className="text-link" href="/survey?withdraw=1">Manage my response or email</Link></div><p className="success-note"><Heart size={14}/> Better ideas begin with people like you.</p></div>;
 const completed = Object.keys(answers ?? {}).filter(id => { const a = answers[id]; return (a.values?.length ?? 0) > 0 || !!a.text?.trim(); }).length;
 const answerErrors = validateAnswers(answers ?? {}, true);
 const requiredQuestions = sections.flatMap(s => s.questions).filter(q => q.required);
 const progress = Math.round(requiredQuestions.filter(q => !answerErrors[q.id]).length / requiredQuestions.length * 100);
 const current = sections[Math.min(step, 5)]; const SectionIcon = icons[Math.min(step, 5)];
 return <div className="survey-layout container" ref={surveyTop}>
  <aside className="survey-sidebar"><Link className="back-home" href="/"><ArrowLeft size={14}/> Back to home</Link><div className="sidebar-title"><span className="eyebrow">YOUR PREPARATION, IN PERSPECTIVE</span><h2>A little reflection.<br />A clearer picture.</h2><p>Six short sections.<br />Your honest experience.</p></div><nav aria-label="Survey sections"><ol className="section-list">{sections.map((section,i) => { const Icon = icons[i]; return <li key={section.id} className={i === step ? 'current' : i < step ? 'complete' : ''}><span className="section-step-icon">{i < step ? <Check size={15}/> : <Icon size={17}/>}</span><span><small>SECTION {i+1}</small><strong>{section.title}</strong></span>{i === step && <ChevronRight size={14}/>}</li>; })}</ol></nav><div className="sidebar-privacy"><LockKeyhole size={18}/><h3>A space for honest answers.</h3><p>No identity details required. Email for early access is optional.</p><Link href="/privacy">Privacy & participation <ArrowRight size={12}/></Link></div></aside>
  <div className="survey-main"><div className="survey-progress-panel"><div className="survey-progress-top"><span>{step === 6 ? 'Review your responses' : `Section ${step+1} of 6`}</span><span>{progress}% answered</span></div><div className="progress-track" role="progressbar" aria-label="Required survey questions answered" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div><div className="survey-meta"><span><LockKeyhole size={12}/> Private student research</span><span aria-live="polite">{saving ? <><LoaderCircle size={13} className="spin"/> Saving…</> : saved ? <><Save size={14}/> Draft saved</> : 'Answers not yet saved'}</span></div>
  </div>{!ready ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={23}/><p>Opening your survey…</p></div> : <>
  {resumed && <div className="notice notice-success"><Save size={16}/><span>Welcome back. Your saved answers are ready.</span><button aria-label="Dismiss welcome message" onClick={() => setResumed(false)}>×</button></div>}
  {error && <div className="notice notice-error" role="alert"><ShieldCheck size={18}/><div><strong>{saving ? 'Saving your progress…' : 'Your progress needs attention.'}</strong><p>{error}</p><button className="text-link" onClick={() => save(form.getValues(), step).catch(() => {})}>Try saving again</button></div></div>}
  <form noValidate onSubmit={event => { void form.handleSubmit(submit, () => { const result=finalSubmissionSchema.safeParse(form.getValues()); setFieldErrors(result.success?{}:Object.fromEntries(result.error.issues.map(i=>[i.path[0]==='responses'?String(i.path[1]):String(i.path[0]),i.message]))); setError('Please review the highlighted questions before submitting.'); })(event); }}>
  {step < 6 ? <><div className="section-heading"><span className="section-kicker"><SectionIcon size={16}/> SECTION {step+1} · {current.questions.length} QUESTIONS</span><h1>{current.title}</h1><p>{sectionDescriptions[step]}</p></div><div className="question-stack">{current.questions.map(q => <QuestionCard key={q.id} question={q} answer={answers?.[q.id]} error={fieldErrors[q.id]} onChange={a => { form.setValue(`responses.${q.id}`, a, { shouldDirty: true }); setFieldErrors(prev => ({ ...prev, [q.id]: '' })); }}/>)}</div><div className="survey-controls"><Button type="button" variant="secondary" disabled={step === 0} onClick={() => goTo(step-1)}><ArrowLeft size={16}/> Previous</Button><span>{completed} of 28 answered</span><Button type="button" onClick={next}>{returnReview ? 'Return to review' : step === 5 ? 'Review answers' : 'Continue'}<ArrowRight size={16}/></Button></div></> : <><div className="section-heading"><span className="section-kicker"><ClipboardCheck size={16}/> ONE LAST LOOK</span><h1>Your experience, in your words.</h1><p>Take a moment to review. You can edit any section before sharing your response.</p></div><div className="review-stack">{sections.map((section, i) => <section className="review-section" key={section.id}><div className="review-section-header"><h2>{i+1}. {section.title}</h2><Button variant="ghost" size="sm" type="button" aria-label={`Edit ${section.title}`} onClick={() => { setReturnReview(true); goTo(i); }}><Edit3 size={13}/> Edit</Button></div><dl>{section.questions.map(q => <div key={q.id}><dt>{q.number}. {q.prompt}</dt><dd>{displayAnswer(q.id, answers[q.id])}</dd>{fieldErrors[q.id] && <p className="form-error">{fieldErrors[q.id]}</p>}</div>)}</dl></section>)}</div><SubmissionOptions values={formValues} errors={fieldErrors} change={(key,value)=>{ if(key==='email') form.setValue(key,String(value),{shouldDirty:true}); else form.setValue(key,value===true,{shouldDirty:true}); setFieldErrors(previous=>({...previous,[key]:''})); }}/><div className="survey-controls"><Button type="button" variant="secondary" disabled={submitting} onClick={() => goTo(5)}><ArrowLeft size={16}/> Previous</Button><Button type="submit" disabled={submitting}>{submitting ? <LoaderCircle size={16} className="spin"/> : <CheckCircle2 size={16}/>} {submitting ? 'Submitting…' : 'Submit response'}</Button></div></>}
  </form></>}
  <p className="survey-bottom-note"><LockKeyhole size={12}/> Drafts saved on this browser for 30 days. You can leave and return anytime.</p></div>
 </div>;
}
