import { requireAdminPage } from '@/lib/auth';
import { AdminShell } from '@/components/admin/admin-shell';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) { const admin = await requireAdminPage(); return <AdminShell email={admin.email}>{children}</AdminShell>; }
