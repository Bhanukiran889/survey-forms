import { route, json } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
export const GET = route(async () => json({ admin: await requireAdmin() }));
