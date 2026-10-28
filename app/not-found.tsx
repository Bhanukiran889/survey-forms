import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { Button } from '@/components/ui/button';
export default function NotFound() { return <><PublicHeader/><main id="main" className="error-page"><span className="eyebrow">404 · A SMALL DETOUR</span><h1>This page isn’t part of the study.</h1><p>The link may have changed, or this response is no longer available.</p><Button asChild><Link href="/"><ArrowLeft size={16}/>Back to home</Link></Button></main></>; }
