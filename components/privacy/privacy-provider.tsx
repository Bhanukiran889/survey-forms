'use client';
import { createContext,useContext,useEffect,useRef,useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Cookie,LoaderCircle,ShieldCheck,X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { api,errorMessage } from '@/lib/client-api';
import { campaignFromSearch,POLICY_VERSION } from '@/lib/privacy-schema';
type Preference={decided:boolean;analytics:boolean;policyVersion:string};
const PrivacyContext=createContext({openSettings:()=>{}});
export function CookieSettingsButton(){const{openSettings}=useContext(PrivacyContext);return <button type="button" className="footer-cookie-button" onClick={openSettings}>Cookie settings</button>;}
export function PrivacyProvider({children}:{children:React.ReactNode}){
 const pathname=usePathname();const[preference,setPreference]=useState<Preference|null>(null),[open,setOpen]=useState(false),[analytics,setAnalytics]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const captured=useRef('');
 useEffect(()=>{let active=true;api<Preference>('/api/privacy/preferences').then(p=>{if(active){setPreference(p);setAnalytics(p.analytics);}},()=>{if(active)setPreference({decided:false,analytics:false,policyVersion:POLICY_VERSION});});return()=>{active=false;};},[]);
 useEffect(()=>{
  if(!preference?.decided||!preference.analytics||pathname.startsWith('/admin'))return;
  const campaign=campaignFromSearch(window.location.search);if(!campaign)return;
  const identity=JSON.stringify(campaign);if(captured.current===identity)return;
  captured.current=identity;
  api('/api/privacy/attribution',{method:'POST',body:identity}).catch(()=>{captured.current='';});
 },[pathname,preference]);
 async function choose(value:boolean){
  setBusy(true);setError('');
  try{const campaign=value?campaignFromSearch(window.location.search):undefined;const result=await api<Preference>('/api/privacy/preferences',{method:'POST',body:JSON.stringify({analytics:value,policyVersion:POLICY_VERSION,...(campaign?{campaign}:{})})});if(campaign)captured.current=JSON.stringify(campaign);setPreference(result);setAnalytics(value);setOpen(false);}
  catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 const hidden=pathname.startsWith('/admin');
 return <PrivacyContext.Provider value={{openSettings:()=>{setAnalytics(preference?.analytics??false);setError('');setOpen(true);}}}>{children}{!hidden&&preference&&!preference.decided&&!open&&<section className="cookie-banner" aria-label="Your cookie choices"><div className="cookie-banner-copy"><span className="cookie-banner-icon"><Cookie size={22}/></span><div><h2>Your privacy. Your choice.</h2><p>Essential cookies save your survey. Optional campaign cookies help us understand which links reach students. Your choices are saved securely.</p><Link href="/cookies">How we use cookies</Link></div></div><div className="cookie-actions"><Button variant="secondary" disabled={busy} onClick={()=>choose(false)}>Reject optional</Button><Button variant="secondary" disabled={busy} onClick={()=>choose(true)}>Accept optional</Button><button type="button" className="text-link" onClick={()=>setOpen(true)}>Preferences</button></div>{error&&<p className="form-error" role="alert">{error} Your preference has not been saved.</p>}</section>}<Dialog.Root open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="privacy-dialog"><Dialog.Title><ShieldCheck size={24}/> Your cookie preferences</Dialog.Title><Dialog.Description>Choose what you share. You can complete the survey with optional cookies switched off.</Dialog.Description><div className="cookie-setting"><div><strong>Essential cookies</strong><p>Keep your anonymous draft, researcher session, and privacy choices working.</p></div><Checkbox checked disabled aria-label="Essential cookies are always on"/></div><div className="cookie-setting"><div><label htmlFor="analytics-cookies">Optional campaign attribution</label><p>Save the campaign labels from a link for up to 30 days. No advertising pixels, IP addresses, or device fingerprints.</p></div><Checkbox id="analytics-cookies" checked={analytics} onCheckedChange={v=>setAnalytics(v===true)}/></div><p className="cookie-policy-detail">Changing this to off removes saved campaign attribution, including attribution attached to your responses on this browser. Your preference record is kept for 180 days. <Link href="/cookies">Read the cookie notice.</Link></p>{error&&<p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><Button variant="secondary" disabled={busy} onClick={()=>choose(false)}>Reject optional</Button><Button disabled={busy} onClick={()=>choose(analytics)}>{busy&&<LoaderCircle size={16} className="spin"/>}Save preferences</Button></div><Dialog.Close className="dialog-close" aria-label="Close cookie preferences"><X size={20}/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root></PrivacyContext.Provider>;
}
