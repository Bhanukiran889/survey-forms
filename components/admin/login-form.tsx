'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/client-api';
export function LoginForm() {
 const router = useRouter(); const [error, setError] = useState(''), [busy, setBusy] = useState(false), [visible, setVisible] = useState(false);
 return <form className="login-form" onSubmit={async event => { event.preventDefault(); setError(''); setBusy(true); const values = new FormData(event.currentTarget); try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: values.get('email'), password: values.get('password') }) }); router.push('/admin/dashboard'); router.refresh(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } }}><label className="field-label" htmlFor="email">Email address</label><input className="input" type="email" id="email" name="email" placeholder="you@institution.edu" required maxLength={254} autoComplete="username"/><label className="field-label" htmlFor="password">Password</label><div className="password-field"><input className="input" id="password" name="password" type={visible ? 'text' : 'password'} required maxLength={256} autoComplete="current-password" placeholder="Enter your password"/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{error && <div className="notice notice-error" role="alert">{error}</div>}<Button size="lg" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <LockKeyhole size={16}/>} {busy ? 'Signing in…' : 'Sign in to workspace'}{!busy && <ArrowRight size={17}/>}</Button><p>Researcher accounts are provisioned by the study administrator.</p></form>;
}
