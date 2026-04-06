import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getLeagueById } from '@/lib/cosmos';
import LeagueTable from '@/components/LeagueTable';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeaguePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const league = await getLeagueById(id);
  if (!league) notFound();

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <p className="text-[#8a9aa8] text-xs mb-4">
          <Link href="/leagues" className="hover:text-[#FFD700] focus:underline">Leagues</Link>
          {' / '}
          <span className="text-[#e8e8e8]">{league.name}</span>
        </p>

        <LeagueTable league={league} />
      </div>
    </main>
  );
}
