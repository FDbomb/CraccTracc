import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome to your Dashboard, {session.user?.name}!</h1>
      <p>This is a protected route.</p>
    </div>
  );
}
