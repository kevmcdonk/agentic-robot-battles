import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const user = session.user as { roles?: string[] };
  if (!user.roles?.includes('admin')) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="arena-heading mb-6 text-3xl text-[#FFD700]">Admin Control Room</h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/admin/leagues"
            className="block rounded border border-[#3a3a3a] bg-[#242424] p-5 transition-colors hover:border-[#FFD700]/70 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
          >
            <h2 className="arena-heading text-xl text-[#FFD700]">League Setup</h2>
            <p className="mt-2 text-sm text-[#8a9aa8]">
              Create leagues, assign approved robots, and update league rosters.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}