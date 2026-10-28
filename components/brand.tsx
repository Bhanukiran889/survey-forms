import Link from 'next/link';
import { Activity } from 'lucide-react';
export function Brand({ light = false }: { light?: boolean }) { return <Link href="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="RecallMD home"><span className="brand-mark"><Activity size={23} strokeWidth={2.2} /></span><span>Recall<span className="brand-md">MD</span><span className="brand-dot">.</span></span></Link>; }
