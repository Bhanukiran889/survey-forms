'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '@/lib/client-api';
import { BOT_ACTION, BOT_TICKET_SECONDS, type BotProof, type ProtectionChallenge } from '@/lib/bot-contract';
import { Button } from '@/components/ui/button';

type Turnstile = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
  reset(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }

export function SurveyProtection({ onChange }: { onChange: (proof: BotProof | null) => void }) {
  const [challenge, setChallenge] = useState<ProtectionChallenge | null>(null);
  const [website, setWebsite] = useState('');
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const refresh = useCallback(() => { setChallenge(null); setToken(''); setReady(false); setError(''); setAttempt(value => value + 1); }, []);

  useEffect(() => {
    let active = true;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    api<ProtectionChallenge>('/api/survey/protection', { method: 'POST', body: '{}' }).then(result => {
      if (!active) return;
      setChallenge(result);
      if (result.readyInMs > 0) readyTimer = setTimeout(() => setReady(true), result.readyInMs);
      else setReady(true);
      expiryTimer = setTimeout(refresh, (BOT_TICKET_SECONDS - 30) * 1000);
    }, reason => { if (active) setError(errorMessage(reason)); });
    return () => { active = false; clearTimeout(readyTimer); clearTimeout(expiryTimer); };
  }, [attempt, refresh]);

  useEffect(() => {
    const complete = !!challenge && ready && !error && (challenge.mode === 'basic' || !!token);
    onChange(complete ? { ticket: challenge.ticket, website, ...(token ? { turnstileToken: token } : {}) } : null);
    return () => onChange(null);
  }, [challenge, ready, token, website, error, onChange]);

  useEffect(() => {
    if (challenge?.mode !== 'turnstile' || scriptReady) return;
    const timeout = setTimeout(() => setError('The security check is taking too long to load. Please reload the page and try again.'), 15_000);
    return () => clearTimeout(timeout);
  }, [challenge, scriptReady]);

  useEffect(() => {
    if (challenge?.mode !== 'turnstile' || !scriptReady || !container.current || !window.turnstile) return;
    const turnstile = window.turnstile;
    let active = true;
    const widget = turnstile.render(container.current, {
      sitekey: challenge.siteKey,
      action: BOT_ACTION,
      cData: challenge.binding,
      theme: 'light',
      size: container.current.clientWidth < 300 ? 'compact' : 'flexible',
      appearance: 'interaction-only',
      'response-field': false,
      callback: (value: string) => { if (active) { setToken(value); setError(''); } },
      'expired-callback': () => { if (active) { setToken(''); turnstile.reset(widget); } },
      'timeout-callback': () => { if (active) { setToken(''); setError('The security check timed out. Please try it again.'); } },
      'error-callback': () => { if (active) { setToken(''); setError('The security check couldn’t finish. Please try it again.'); } },
    });
    return () => { active = false; turnstile.remove(widget); };
  }, [challenge, scriptReady]);

  const complete = !!challenge && ready && !error && (challenge.mode === 'basic' || !!token);
  return <section className="survey-protection" aria-labelledby="survey-protection-title">
    <h2 className="survey-protection-title" id="survey-protection-title"><ShieldCheck size={20}/> Protecting genuine responses</h2>
    <p>We check for automated submissions so real student experiences count.</p>
    <div className="survey-honeypot" aria-hidden="true"><label htmlFor="company-website">Leave this field empty</label><input id="company-website" name="company_website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)}/></div>
    {challenge?.mode === 'turnstile' && <><Script id="survey-bot-verification" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => setError('The security check couldn’t load. Please reload the page to try again.')}/><div className="survey-protection-widget" ref={container}/></>}
    {error ? <><p className="form-error" role="alert">{error}</p><Button type="button" variant="secondary" size="sm" onClick={challenge?.mode === 'turnstile' && !scriptReady ? () => window.location.reload() : refresh}>{challenge?.mode === 'turnstile' && !scriptReady ? 'Reload page' : 'Try security check again'}</Button></> : <p className="survey-protection-status" role="status">{complete ? <><CheckCircle2 size={17}/>{challenge?.mode === 'basic' ? 'Spam checks are ready.' : 'Security check completed.'}</> : <><LoaderCircle size={17} className="spin"/>{challenge?.mode === 'turnstile' ? 'Completing a quick security check…' : 'Preparing spam protection…'}</>}</p>}
  </section>;
}
