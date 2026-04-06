import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAllLeagues } from '@/lib/cosmos';

export default async function LeaguesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const leagues = await getAllLeagues();

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="arena-heading text-3xl text-[#FFD700] mb-6">Leagues</h1>

        {leagues.length === 0 ? (
          <div className="bg-[#242424] border border-dashed border-[#3a3a3a] rounded p-12 text-center">
            <p className="text-[#8a9aa8]">No leagues have been created yet. Ask an admin to set one up.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {leagues.map((league) => {
              const topThree = [...league.standings]
                .sort((a, b) => b.points - a.points)
                .slice(0, 3);

              return (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="block bg-[#242424] border border-[#3a3a3a] rounded p-4 hover:border-[#FFD700]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  aria-label={`League: ${league.name}`}
                >
                  <h2 className="arena-heading text-[#FFD700] text-lg mb-1">{league.name}</h2>
                  {league.description && (
                    <p className="text-[#8a9aa8] text-xs mb-3">{league.description}</p>
                  )}
                  <p className="text-xs text-[#8a9aa8] uppercase tracking-widest mb-2">
                    {league.robotIds.length} / 10 robots
                  </p>

                  {topThree.length > 0 && (
                    <ol className="space-y-1">
                      {topThree.map((standing, i) => (
                        <li key={standing.robotId} className="flex justify-between text-sm">
                          <span className="text-[#e8e8e8]">
                            <span className="text-[#8a9aa8] mr-2">{i + 1}.</span>
                            {standing.robotName}
                          </span>
                          <span className="text-[#FFD700] font-black">{standing.points}pts</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
