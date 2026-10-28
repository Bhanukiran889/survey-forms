import { requireAdminPage } from '@/lib/auth';
import { Dashboard } from '@/components/admin/dashboard';
export const metadata = { title: 'Research overview' };
export default async function DashboardPage() { await requireAdminPage(); return <Dashboard/>; }
