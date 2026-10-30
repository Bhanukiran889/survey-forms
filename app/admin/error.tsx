'use client';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function AdminError({ reset }: { reset: () => void }) { return <main id="main" className="error-page"><ShieldAlert size={36}/><h1>The workspace is temporarily unavailable.</h1><p>Please try again shortly. If the problem continues, contact the study administrator.</p><Button onClick={reset}>Try again</Button><Link href="/">Return to survey home</Link></main>; }
