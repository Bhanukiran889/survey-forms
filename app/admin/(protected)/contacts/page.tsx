import { requireAdminPage } from '@/lib/auth';
import { ContactList } from '@/components/admin/contact-list';
export const metadata={title:'Early-access contacts'};
export default async function ContactsPage(){await requireAdminPage();return <ContactList/>;}
