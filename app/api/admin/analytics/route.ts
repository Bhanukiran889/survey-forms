import { route, json } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { getAnalytics } from '@/lib/analytics';
export const GET = route(async () => { await requireAdmin(); return json(await getAnalytics()); });
