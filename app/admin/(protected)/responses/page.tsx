import { requireAdminPage } from '@/lib/auth';
import { ResponseList } from '@/components/admin/response-list';
export const metadata = { title: 'Survey responses' };
export default async function ResponsesPage() { await requireAdminPage(); return <ResponseList/>; }
