import Link from 'next/link';
import { Activity } from 'lucide-react';
export function Footer() { return <footer className="public-footer container"><span><Activity size={15} /> Thoughtful research. Better revision.</span><div><Link href="/privacy">Privacy & participation</Link><span>© {new Date().getFullYear()} RecallMD Research</span></div></footer>; }
