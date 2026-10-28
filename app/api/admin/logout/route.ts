import { route, assertSameOrigin, json } from '@/lib/http';
import { requireAdmin, destroySession } from '@/lib/auth';
export const POST = route(async request => { assertSameOrigin(request); await requireAdmin(); await destroySession(); return json({ authenticated: false }); });
