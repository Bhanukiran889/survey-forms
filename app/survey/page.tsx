import { PublicHeader } from '@/components/public-header';
import { Footer } from '@/components/footer';
import { SurveyFlow } from '@/components/survey/survey-flow';
export const metadata = { title: 'Share your experience', robots: { index: false, follow: false } };
export default async function SurveyPage({ searchParams }: { searchParams: Promise<{ withdraw?: string }> }) { const params = await searchParams; return <><PublicHeader survey /><main id="main"><SurveyFlow withdraw={params.withdraw === '1'}/></main><Footer /></>; }
