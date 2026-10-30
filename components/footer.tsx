import Link from 'next/link';
import { Activity } from 'lucide-react';
import { CookieSettingsButton } from './privacy/privacy-provider';
export function Footer(){return <footer className="public-footer container"><span><Activity size={17}/> Thoughtful research. Better revision.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><CookieSettingsButton/><Link href="/survey?withdraw=1">Manage my data</Link><span>© {new Date().getFullYear()} RecallMD</span></div></footer>;}
