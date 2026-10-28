'use client';
import { Check, Circle } from 'lucide-react';
import type { Answer, Question } from '@/lib/survey-schema';
export function QuestionCard({ question: q, answer = {}, onChange, error }: { question: Question; answer?: Answer; onChange: (a: Answer) => void; error?: string }) {
 const values = answer.values ?? []; const isOther = q.options.some(o => o.label === 'Other' && values.includes(o.value));
 return <fieldset className={`question-card ${error ? 'question-error' : ''}`} id={q.id} aria-describedby={`${q.id}-hint${error ? ` ${q.id}-error` : ''}`}><legend><span className="question-number">{String(q.number).padStart(2, '0')}</span><span>{q.prompt}{!q.required && <span className="optional-tag">Optional</span>}</span></legend><p className="question-hint" id={`${q.id}-hint`}>{q.type === 'multi' ? q.maxSelections ? `Choose up to ${q.maxSelections} · ${values.length} selected` : 'Select all that apply' : q.type === 'text' ? 'Share as much or as little as you like. Please avoid personal or patient details.' : 'Select one answer'}</p>
 {q.type === 'text' ? <div><textarea className="input textarea" aria-label={q.prompt} value={answer.text ?? ''} maxLength={4000} placeholder="Your experience, in your own words…" onChange={e => onChange({ text: e.target.value })}/><span className="character-count">{answer.text?.length ?? 0} / 4,000</span></div> : <div className={`option-grid ${q.options.length > 7 ? 'option-grid-long' : ''}`} role={q.type === 'single' ? 'radiogroup' : 'group'} aria-label={q.prompt}>{q.options.map(option => {
  const selected = values.includes(option.value); const capped = !!q.maxSelections && values.length >= q.maxSelections && !selected;
  return <label className={`option-card ${selected ? 'selected' : ''} ${capped ? 'option-disabled' : ''}`} key={option.value}><input type={q.type === 'single' ? 'radio' : 'checkbox'} name={q.id} value={option.value} checked={selected} disabled={capped} onChange={() => {
   let next = q.type === 'single' ? [option.value] : selected ? values.filter(v => v !== option.value) : [...values, option.value];
   const exclusives = ['I do not experience this regularly', 'No dedicated revision tool', 'I am generally satisfied with my current system', 'Nothing specific'];
   if (!selected && exclusives.includes(option.label)) next = [option.value];
   else if (!selected) next = next.filter(v => !exclusives.includes(q.options.find(o => o.value === v)?.label ?? ''));
   onChange({ values: next, ...(next.some(v => q.options.find(o => o.value === v)?.label === 'Other') ? { other: answer.other ?? '' } : {}) });
  }}/><span className={`option-indicator ${q.type === 'single' ? 'radio-indicator' : ''}`}>{selected ? q.type === 'single' ? <Circle size={8} fill="currentColor" strokeWidth={0}/> : <Check size={13} strokeWidth={3}/> : null}</span><span>{option.label}</span></label>;
 })}</div>}
 {isOther && <div className="other-field"><label htmlFor={`${q.id}-other`}>Please specify</label><input id={`${q.id}-other`} className="input" maxLength={500} placeholder="Tell us a little more…" value={answer.other ?? ''} onChange={e => onChange({ ...answer, other: e.target.value })}/></div>}
 {error && <p className="form-error" id={`${q.id}-error`} role="alert">{error}</p>}
 </fieldset>;
}
