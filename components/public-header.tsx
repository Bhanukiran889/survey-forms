import Link from 'next/link';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { Brand } from './brand';
export function PublicHeader({ survey = false }: { survey?: boolean }) { return <header className="public-header"><div className="container header-inner"><Brand /><span className="header-divider" /><span className="header-label">Student Research Survey</span><nav>{survey ? <Link href="/privacy"><LockKeyhole size={14} /> Your privacy matters</Link> : <><Link className="header-about" href="/#about">About the research</Link><Link className="researcher-link" href="/admin/login">Researcher access <ArrowUpRight size={15} /></Link></>}</nav></div></header>; }
