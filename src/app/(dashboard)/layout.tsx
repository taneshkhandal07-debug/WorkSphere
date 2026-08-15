import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';

export const dynamic = 'force-dynamic';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // 1. If not logged in, redirect to login page
  if (!user) {
    redirect('/login');
  }

  // 2. If account is pending review, redirect to pending page
  if (user.status === 'PENDING') {
    redirect('/pending');
  }

  // 3. If account is not ACTIVE (suspended or deactivated), log them out and redirect to login
  if (user.status !== 'ACTIVE') {
    redirect('/login');
  }

  const currentUser = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };

  return (
    <DashboardShell currentUser={currentUser}>
      {children}
    </DashboardShell>
  );
}
