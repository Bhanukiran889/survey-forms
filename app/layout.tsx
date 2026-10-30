import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { PrivacyProvider } from '@/components/privacy/privacy-provider';
export const metadata: Metadata = { title: { default: 'RecallMD — Help shape a better way to revise.', template: '%s | RecallMD' }, description: 'Share your NEET-PG experience in 5–8 minutes. Help shape RecallMD before launch and be considered for a free subscription. Email optional.', robots: { index: true, follow: true } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><PrivacyProvider>{children}</PrivacyProvider></body></html>; }
