import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function IndexPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  if (user.status === 'PENDING') {
    redirect('/pending');
  }

  if (user.status !== 'ACTIVE') {
    redirect('/login');
  }

  redirect('/dashboard');
}
