'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { api, errorMessage } from '@/lib/client-api';
import { campaignFromSearch, POLICY_VERSION } from '@/lib/privacy-schema';
type Preference = { decided: boolean; analytics: boolean; policyVersion: string };
const PrivacyContext = createContext({ openSettings: () => { } });
export function CookieSettingsButton() { const { openSettings } = useContext(PrivacyContext); return <button type="button" className="footer-cookie-button" onClick={openSettings}>Change cookie preferences</button>; }
export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname(); const [preference, setPreference] = useState<Preference | null>(null), [open, setOpen] = useState(false), [analytics, setAnalytics] = useState(false), [error, setError] = useState(''); const captured = useRef(''); const saveRequest = useRef(0); const pendingPreference = useRef(false);
    useEffect(() => { let active = true; api<Preference>('/api/privacy/preferences').then(p => { if (active) { setPreference(p); setAnalytics(p.analytics); } }, () => { if (active) setPreference({ decided: false, analytics: false, policyVersion: POLICY_VERSION }); }); return () => { active = false; }; }, []);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const fromUrl = campaignFromSearch(window.location.search);
        if (fromUrl) {
            try { sessionStorage.setItem('recallmd_pending_campaign', JSON.stringify(fromUrl)); } catch {}
        }
        if (pendingPreference.current || !preference?.decided || !preference.analytics || pathname.startsWith('/admin')) return;
        let campaign = fromUrl;
        if (!campaign) {
            try {
                const stored = sessionStorage.getItem('recallmd_pending_campaign');
                if (stored) campaign = JSON.parse(stored);
            } catch {}
        }
        if (!campaign) return;
        const identity = JSON.stringify(campaign); if (captured.current === identity) return;
        captured.current = identity;
        api('/api/privacy/attribution', { method: 'POST', body: identity }).catch(() => { captured.current = ''; });
    }, [pathname, preference]);
    async function choose(value: boolean) {
        const requestId = ++saveRequest.current;
        const previousPreference = preference;
        const previousAnalytics = analytics;
        const wasOpen = open;
        let campaign = value ? campaignFromSearch(window.location.search) : undefined;
        if (value && !campaign && typeof window !== 'undefined') {
            try {
                const stored = sessionStorage.getItem('recallmd_pending_campaign');
                if (stored) campaign = JSON.parse(stored);
            } catch {}
        }
        pendingPreference.current = true;
        setError('');
        setPreference({ decided: true, analytics: value, policyVersion: POLICY_VERSION });
        setAnalytics(value);
        setOpen(false);
        try {
            const result = await api<Preference>('/api/privacy/preferences', { method: 'POST', body: JSON.stringify({ analytics: value, policyVersion: POLICY_VERSION, ...(campaign ? { campaign } : {}) }) });
            if (requestId !== saveRequest.current) return;
            if (campaign) captured.current = JSON.stringify(campaign);
            setPreference(result);
            setAnalytics(value);
            setOpen(false);
        }
        catch (e) {
            if (requestId !== saveRequest.current) return;
            pendingPreference.current = false;
            setPreference(previousPreference ?? { decided: false, analytics: false, policyVersion: POLICY_VERSION });
            setAnalytics(previousPreference?.analytics ?? previousAnalytics);
            setError(errorMessage(e));
            setOpen(wasOpen);
        }
        finally {
            if (requestId === saveRequest.current) pendingPreference.current = false;
        }
    }
    const hidden = pathname.startsWith('/admin');
    const openSettings = () => { setAnalytics(preference?.analytics ?? false); setError(''); setOpen(true); };
    return <PrivacyContext.Provider value={{ openSettings }}>{children}{!hidden && preference && !preference.decided && !open && <section className="cookie-banner" aria-label="Your cookie choices"><div className="cookie-banner-copy"><span className="cookie-banner-icon"><Cookie size={22} /></span><div><h2>Your privacy. Your choice.</h2><p>Essential cookies save your survey. campaign cookies help us understand which links reach students. Your choices are saved securely.</p><Link href="/cookies">How we use cookies</Link></div></div><div className="cookie-actions"><Button variant="secondary" onClick={() => choose(false)}>Reject</Button><Button variant="secondary" onClick={() => choose(true)}>Accept</Button><button type="button" className="text-link" onClick={openSettings}>Preferences</button></div>{error && <p className="form-error" role="alert">{error} Your preference has not been saved.</p>}</section>}<Dialog.Root open={open} onOpenChange={setOpen}><>{!hidden && preference?.decided && <Dialog.Trigger asChild><button type="button" className="cookie-revisit" aria-label="Open cookie preferences" title="Cookie preferences" onClick={openSettings}><Cookie size={31} strokeWidth={1.8} aria-hidden="true"/></button></Dialog.Trigger>}<Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="privacy-dialog"><Dialog.Title><ShieldCheck size={24} /> Your cookie preferences</Dialog.Title><Dialog.Description>Choose what you share. You can complete the survey with optional cookies switched off.</Dialog.Description><div className="cookie-setting"><div><strong>Essential cookies</strong><p>Keep your saved survey progress, privacy choices, and researcher sign-in working.</p></div><Checkbox checked disabled aria-label="Essential cookies are always on" /></div><div className="cookie-setting"><div><label htmlFor="analytics-cookies">campaign information</label><p>Help us understand which survey links reach students. Campaign information is saved for up to 30 days. We do not use advertising trackers or identify your device.</p></div><Checkbox id="analytics-cookies" checked={analytics} onCheckedChange={v => setAnalytics(v === true)} /></div><p className="cookie-policy-detail">Switching this off removes saved campaign information, including information linked to your responses on this browser. Your cookie choice is remembered for 180 days. <Link href="/cookies">Read the cookie notice.</Link></p>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><Button variant="secondary" onClick={() => choose(false)}>Reject</Button><Button onClick={() => choose(analytics)}>Save preferences</Button></div><Dialog.Close className="dialog-close" aria-label="Close cookie preferences"><X size={20} /></Dialog.Close></Dialog.Content></Dialog.Portal></></Dialog.Root></PrivacyContext.Provider>;
}
