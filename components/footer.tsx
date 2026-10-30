import Link from 'next/link';
import { Activity } from 'lucide-react';
export function Footer(){return <footer className="public-footer container"><span><Activity size={17}/> Better revision starts with your experience.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookie settings</Link><Link href="/survey?withdraw=1">Manage my data</Link><span>© {new Date().getFullYear()} RecallMD</span></div></footer>;}
