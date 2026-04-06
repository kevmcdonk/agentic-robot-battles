import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAllBattles, getAllRobots, getAllUserProfiles, getBattlesByUser, getRobotsByUser } from '@/lib/cosmos';
import { Battle } from '@/lib/types';
import BattleChallengePanel from '@/components/BattleChallengePanel';
import BattleRequestActions from '@/components/BattleRequestActions';

const statusColour: Record<Battle['status'], string> = {
  pending: 'text-yellow-400',
  accepted: 'text-blue-400',
  declined: 'text-[#8a9aa8]',
  simulating: 'text-[#FF6B00]',
  completed: 'text-green-400',
};

export default async function BattlesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const userId = (session.user as { id: string }).id;
  const [myBattles, myRobots, allRobots, allUsers, allBattles] = await Promise.all([
    getBattlesByUser(userId),
    getRobotsByUser(userId),
    getAllRobots(),
    getAllUserProfiles(),
    getAllBattles(),
  ]);

  const ownerDisplayByUserId = Object.fromEntries(
    allUsers.map((profile) => [profile.id, profile.displayName || profile.email]),
  );

  const myApprovedRobots = myRobots
    .filter((robot) => robot.validationStatus === 'approved')
    .map((robot) => ({
      id: robot.id,
      name: robot.name,
      ownerDisplayName: ownerDisplayByUserId[robot.userId] ?? 'You',
    }));

  const opponentRobots = allRobots
    .filter((robot) => robot.userId !== userId && robot.validationStatus === 'approved')
    .map((robot) => ({
      id: robot.id,
      name: robot.name,
      ownerDisplayName: ownerDisplayByUserId[robot.userId] ?? 'Unknown Owner',
    }));

  const pendingRequests = myBattles.filter(
    (battle) => battle.status === 'pending' && battle.challengedUserId === userId,
  );

  const watchableBattles = allBattles
    .filter((battle) => battle.status === 'completed')
    .sort((a, b) => Date.parse(b.completedAt ?? b.createdAt) - Date.parse(a.completedAt ?? a.createdAt))
    .slice(0, 10);

  const battleByRobotId = new Map(allRobots.map((robot) => [robot.id, robot]));

  function battleTitle(battle: Battle): string {
    const challenger = battleByRobotId.get(battle.challengerRobotId);
    const challenged = battleByRobotId.get(battle.challengedRobotId);
    return `${challenger?.name ?? 'Unknown Robot'} vs ${challenged?.name ?? 'Unknown Robot'}`;
  }

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="arena-heading text-3xl text-[#FFD700] mb-6">Battles</h1>

        <div className="mb-8">
          <BattleChallengePanel myRobots={myApprovedRobots} opponentRobots={opponentRobots} />
        </div>

        <section className="mb-8" aria-label="Pending requests to accept">
          <h2 className="arena-heading text-lg text-[#FF6B00] mb-3">Requested Battles</h2>

          {pendingRequests.length === 0 ? (
            <p className="rounded border border-dashed border-[#3a3a3a] bg-[#242424] p-4 text-sm text-[#8a9aa8]">
              No pending requests for your robots.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((battle) => (
                <div key={battle.id} className="rounded border border-[#FF6B00]/50 bg-[#242424] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#e8e8e8]">{battleTitle(battle)}</p>
                      <p className="text-xs text-[#8a9aa8]">Requested {new Date(battle.createdAt).toLocaleString()}</p>
                    </div>
                    <Link
                      href={`/battles/${battle.id}`}
                      className="text-xs font-bold uppercase tracking-widest text-[#FFD700] hover:text-[#FF6B00] focus:outline-none focus:underline"
                    >
                      Open
                    </Link>
                  </div>
                  <BattleRequestActions battleId={battle.id} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8" aria-label="Watch completed battles">
          <h2 className="arena-heading text-lg text-white mb-3">Watch Battles</h2>

          {watchableBattles.length === 0 ? (
            <p className="rounded border border-dashed border-[#3a3a3a] bg-[#242424] p-4 text-sm text-[#8a9aa8]">
              No completed battles yet.
            </p>
          ) : (
            <div className="space-y-2">
              {watchableBattles.map((battle) => (
                <Link
                  key={battle.id}
                  href={`/battles/${battle.id}`}
                  className="flex items-center justify-between rounded border border-[#3a3a3a] bg-[#242424] p-3 transition-colors hover:border-[#FFD700]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                >
                  <span className="text-sm text-[#e8e8e8]">{battleTitle(battle)}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-green-400">Watch</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section aria-label="Your battles">
          <h2 className="arena-heading text-lg text-white mb-3">Your Battle History</h2>

        {myBattles.length === 0 ? (
          <div className="bg-[#242424] border border-dashed border-[#3a3a3a] rounded p-12 text-center">
            <p className="text-[#8a9aa8] mb-4">No battles yet. Challenge a rival robot to fight.</p>
            <Link href="/robots" className="text-[#FFD700] font-bold hover:underline focus:outline-none focus:underline">
              View my robots →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myBattles.map((battle) => (
              <Link
                key={battle.id}
                href={`/battles/${battle.id}`}
                className="flex items-center justify-between bg-[#242424] border border-[#3a3a3a] rounded p-4 hover:border-[#FFD700]/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                aria-label={`Battle ${battle.id} — status: ${battle.status}`}
              >
                <div>
                  <p className="text-[#e8e8e8] text-sm">
                    {battle.challengerUserId === userId ? 'You challenged' : 'You were challenged'}
                  </p>
                  <p className="text-[#8a9aa8] text-xs mt-0.5">
                    {new Date(battle.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-bold uppercase tracking-widest ${statusColour[battle.status]}`}>
                    {battle.status}
                  </span>
                  {battle.status === 'completed' && (
                    <span className={`text-xs font-bold ${
                      battle.winnerId === null
                        ? 'text-[#8a9aa8]'
                        : battle.challengerUserId === userId
                          ? (battle.winnerId ? 'text-green-400' : 'text-red-400')
                          : 'text-[#8a9aa8]'
                    }`}>
                      {battle.winnerId === null ? 'DRAW' : '⚔ RESULT'}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        </section>
      </div>
    </main>
  );
}
