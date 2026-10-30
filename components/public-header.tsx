import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { Brand } from './brand';
export function PublicHeader({ survey = false }: { survey?: boolean }) { return <header className="public-header"><div className="container header-inner"><Brand /><span className="header-divider" /><span className="header-label">Student Research Survey</span><nav>{survey ? <Link href="/privacy"><LockKeyhole size={14} /> Your privacy matters</Link> : <><Link className="header-about" href="/#about">About the research</Link><Link href="/survey" className="header-survey-link">Take the survey</Link></>}</nav></div></header>; }
