import { LoaderCircle } from 'lucide-react';
export default function Loading() { return <div className="loading-state" role="status"><LoaderCircle size={24} className="spin"/><p>Opening your workspace…</p></div>; }
