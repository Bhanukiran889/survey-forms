import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { PrivacyProvider } from '@/components/privacy/privacy-provider';
export const metadata: Metadata = { title: { default: 'RecallMD — Your preparation, better understood.', template: '%s | RecallMD' }, description: 'A student research survey exploring memory, revision, and the everyday reality of NEET-PG preparation.', robots: { index: true, follow: true } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><PrivacyProvider>{children}</PrivacyProvider></body></html>; }
