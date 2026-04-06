import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getRobotsByUser, getBattlesByUser, getAllLeagues } from '@/lib/cosmos';
import RobotCard from '@/components/RobotCard';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const userId = (session.user as { id: string }).id;
  const [robots, battles, leagues] = await Promise.all([
    getRobotsByUser(userId),
    getBattlesByUser(userId),
    getAllLeagues(),
  ]);

  const pendingInvites = battles.filter(
    (b) => b.status === 'pending' && b.challengedUserId === userId,
  );

  const totalWins = robots.reduce((s, r) => s + r.wins, 0);
  const totalLosses = robots.reduce((s, r) => s + r.losses, 0);
  const totalDraws = robots.reduce((s, r) => s + r.draws, 0);
  const totalFights = totalWins + totalLosses + totalDraws;

  const myLeague = leagues.find((l) => robots.some((r) => l.robotIds.includes(r.id)));
  const myStanding = myLeague?.standings
    .filter((s) => robots.some((r) => r.id === s.robotId))
    .sort((a, b) => b.points - a.points)[0];

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="arena-heading text-3xl text-[#FFD700]">Dashboard</h1>
          <p className="text-[#8a9aa8] text-sm mt-1">
            Welcome back, {session.user?.name ?? 'Combatant'}
          </p>
        </div>

        {/* Win / Loss / Draw record */}
        {totalFights > 0 && (
          <section className="mb-8 bg-[#242424] border border-[#3a3a3a] rounded p-4" aria-label="Your overall battle record">
            <p className="text-[#8a9aa8] text-xs uppercase tracking-widest mb-3">Overall Record</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-green-400 font-black text-3xl">{totalWins}</p>
                <p className="text-[#8a9aa8] text-xs uppercase tracking-widest mt-1">Wins</p>
              </div>
              <div>
                <p className="text-[#8a9aa8] font-black text-3xl">{totalDraws}</p>
                <p className="text-[#8a9aa8] text-xs uppercase tracking-widest mt-1">Draws</p>
              </div>
              <div>
                <p className="text-red-400 font-black text-3xl">{totalLosses}</p>
                <p className="text-[#8a9aa8] text-xs uppercase tracking-widest mt-1">Losses</p>
              </div>
            </div>
            {totalFights > 0 && (
              <div className="mt-3 space-y-1" aria-label={`Win rate: ${Math.round((totalWins / totalFights) * 100)}%`}>
                <progress className="battle-progress" value={totalWins} max={totalFights} aria-label="Wins" />
                <progress className="battle-progress" value={totalDraws} max={totalFights} aria-label="Draws" />
                <progress className="battle-progress" value={totalLosses} max={totalFights} aria-label="Losses" />
              </div>
            )}
          </section>
        )}

        {/* Pending battle invites */}
        {pendingInvites.length > 0 && (
          <section className="mb-8" aria-label="Pending battle invites">
            <div className="hazard-stripe h-1 rounded mb-3" aria-hidden="true" />
            <h2 className="arena-heading text-lg text-[#FF6B00] mb-3">
              ⚠ {pendingInvites.length} Battle Invite{pendingInvites.length > 1 ? 's' : ''} Awaiting Response
            </h2>
            <div className="space-y-2">
              {pendingInvites.map((battle) => (
                <Link
                  key={battle.id}
                  href={`/battles/${battle.id}`}
                  className="flex items-center justify-between bg-[#242424] border border-[#FF6B00]/50 rounded p-3 hover:border-[#FF6B00] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  aria-label={`Battle invite: view battle ${battle.id}`}
                >
                  <span className="text-[#e8e8e8] text-sm">Battle challenge received</span>
                  <span className="text-[#FF6B00] text-xs uppercase tracking-widest font-bold">View →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* League position summary */}
        {myLeague && myStanding && (
          <section className="mb-8 bg-[#242424] border border-[#3a3a3a] rounded p-4" aria-label="Your league position">
            <p className="text-[#8a9aa8] text-xs uppercase tracking-widest mb-1">League</p>
            <h2 className="arena-heading text-[#FFD700] text-lg mb-3">{myLeague.name}</h2>
            <div className="flex gap-6 text-sm">
              <div><span className="text-[#8a9aa8]">Points </span><span className="text-[#FFD700] font-black text-xl">{myStanding.points}</span></div>
              <div><span className="text-[#8a9aa8]">W </span><span className="text-green-400 font-bold">{myStanding.wins}</span></div>
              <div><span className="text-[#8a9aa8]">D </span><span className="text-[#8a9aa8] font-bold">{myStanding.draws}</span></div>
              <div><span className="text-[#8a9aa8]">L </span><span className="text-red-400 font-bold">{myStanding.losses}</span></div>
            </div>
            <Link href={`/leagues/${myLeague.id}`} className="text-xs text-[#8a9aa8] hover:text-[#FFD700] mt-3 inline-block focus:outline-none focus:underline">
              Full standings →
            </Link>
          </section>
        )}

        {/* My Robots */}
        <section aria-label="Your robots">
          <div className="flex items-center justify-between mb-3">
            <h2 className="arena-heading text-lg text-white">My Robots</h2>
            <Link
              href="/robots/new"
              className="text-sm bg-[#FFD700] text-[#1a1a1a] px-3 py-1 rounded font-bold uppercase tracking-widest hover:bg-[#FF6B00] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            >
              + New Robot
            </Link>
          </div>

          {robots.length === 0 ? (
            <div className="bg-[#242424] border border-dashed border-[#3a3a3a] rounded p-8 text-center">
              <p className="text-[#8a9aa8] mb-3">No robots yet. Build your first combat machine.</p>
              <Link
                href="/robots/new"
                className="text-[#FFD700] font-bold hover:underline focus:outline-none focus:underline"
              >
                Build a robot →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {robots.slice(0, 4).map((robot) => (
                <RobotCard key={robot.id} robot={robot} href={`/robots/${robot.id}`} />
              ))}
            </div>
          )}

          {robots.length > 4 && (
            <Link href="/robots" className="text-sm text-[#8a9aa8] hover:text-[#FFD700] mt-3 inline-block focus:outline-none focus:underline">
              View all {robots.length} robots →
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}
