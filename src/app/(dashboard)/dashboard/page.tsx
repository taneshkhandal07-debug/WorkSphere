import { getSessionUser } from '@/lib/auth';
import DashboardView from '@/components/dashboard/DashboardView';

export default async function DashboardPage() {
  const user = await getSessionUser();

  const currentUser = {
    firstName: user?.firstName || 'User',
    lastName: user?.lastName || '',
    role: user?.role || 'EMPLOYEE',
  };

  return <DashboardView user={currentUser} />;
}
