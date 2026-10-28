import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Quote } from 'lucide-react';
import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/auth';
import { Brand } from '@/components/brand';
import { LoginForm } from '@/components/admin/login-form';
export const metadata = { title: 'Researcher sign in', robots: { index: false, follow: false } };
export default async function Login() {
 if (await currentAdmin()) redirect('/admin/dashboard');
 return <main id="main" className="login-page"><section className="login-story"><Brand light/><div><span className="eyebrow">THE RESEARCH WORKSPACE</span><Quote size={38}/><h1>Listen closely.<br />Understand deeply.<br /><span>Build thoughtfully.</span></h1><p>A clearer view of the students behind the study hours.</p><div className="login-story-line"/></div><span className="login-security"><ShieldCheck size={17}/> Private research. Purposeful access.</span></section><section className="login-panel"><Link href="/" className="back-home"><ArrowLeft size={15}/> Back to survey home</Link><div className="login-box"><span className="area-icon"><ShieldCheck size={25}/></span><span className="eyebrow">RESEARCHER ACCESS</span><h2>Welcome to the workspace.</h2><p>Sign in to explore responses and understand the bigger picture.</p><LoginForm /></div><span className="login-footer">RecallMD Research · Authorized researchers only</span></section></main>;
}
