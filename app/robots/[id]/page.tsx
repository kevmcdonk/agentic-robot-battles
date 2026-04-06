import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getRobotById, getBattlesByUser } from '@/lib/cosmos';
import { StatBar } from '@/components/RobotCard';
import ValidateRobotButton from '@/components/ValidateRobotButton';

interface Props {
  params: Promise<{ id: string }>;
}

const statusColour: Record<string, string> = {
  pending: 'bg-[#555] text-white',
  approved: 'bg-green-700 text-white',
  rejected: 'bg-red-700 text-white',
  needs_revision: 'bg-yellow-600 text-black',
};

export default async function RobotProfilePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const userId = (session.user as { id: string }).id;
  const user = session.user as { roles?: string[] };
  const isAdmin = user.roles?.includes('admin') ?? false;

  const robot = await getRobotById(id, userId);
  if (!robot || (robot.userId !== userId && !isAdmin)) notFound();

  const battles = await getBattlesByUser(userId);
  const robotBattles = battles.filter(
    (b) => b.challengerRobotId === id || b.challengedRobotId === id,
  );

  const isOwner = robot.userId === userId;

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <p className="text-[#8a9aa8] text-xs mb-4">
          <Link href="/robots" className="hover:text-[#FFD700] focus:underline">My Robots</Link>
          {' / '}
          <span className="text-[#e8e8e8]">{robot.name}</span>
        </p>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="arena-heading text-3xl text-[#FFD700]">{robot.name}</h1>
            <p className="text-[#8a9aa8] italic mt-1">{robot.tagline}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColour[robot.validationStatus]}`}>
              {robot.validationStatus.replace('_', ' ')}
            </span>
            <ValidateRobotButton robotId={robot.id} />
            {robot.locked && (
              <span className="text-xs bg-[#FF6B00]/20 text-[#FF6B00] px-2 py-0.5 rounded">
                🔒 Locked
              </span>
            )}
          </div>
        </div>

        {/* Validation notes */}
        {robot.validationNotes && (
          <div className="mb-6 bg-[#2a2a2a] border border-[#3a3a3a] rounded p-3 text-sm text-[#e8e8e8]">
            <p className="text-xs text-[#8a9aa8] uppercase tracking-widest mb-1">Validation Notes</p>
            <p>{robot.validationNotes}</p>
          </div>
        )}

        {/* Specs */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <Spec label="Weight Class" value={robot.weightClass} />
          <Spec label="Weapon" value={robot.weaponType} />
          <Spec label="Armour" value={robot.armourType} />
          <Spec label="Movement" value={robot.movementType} />
        </div>

        {/* Description */}
        <div className="mb-6">
          <p className="text-xs text-[#8a9aa8] uppercase tracking-widest mb-1">Description</p>
          <p className="text-[#e8e8e8] text-sm">{robot.description}</p>
        </div>

        {/* Stats */}
        <div className="mb-6 bg-[#242424] border border-[#3a3a3a] rounded p-4">
          <p className="text-xs text-[#8a9aa8] uppercase tracking-widest mb-3">Stats</p>
          <StatBar label="Weapon Damage" value={robot.stats.weaponDamage} />
          <StatBar label="Armour Rating" value={robot.stats.armourRating} />
          <StatBar label="Speed" value={robot.stats.speed} />
          <StatBar label="Aggression" value={robot.stats.aggression} />
          <StatBar label="Reliability" value={robot.stats.reliability} />
          <p className="text-xs text-[#8a9aa8] mt-2 text-right">
            Total: {Object.values(robot.stats).reduce((a, b) => a + b, 0)} / 35
          </p>
        </div>

        {/* W/D/L */}
        <div className="flex gap-6 text-lg font-black mb-6" aria-label={`Record: ${robot.wins} wins, ${robot.draws} draws, ${robot.losses} losses`}>
          <span className="text-green-400">{robot.wins}W</span>
          <span className="text-[#8a9aa8]">{robot.draws}D</span>
          <span className="text-red-400">{robot.losses}L</span>
        </div>

        {/* Actions */}
        {isOwner && (
          <div className="flex gap-3 mb-8 flex-wrap">
            {!robot.locked && (
              <Link
                href={`/robots/${robot.id}/edit`}
                className="px-4 py-2 border border-[#FFD700] text-[#FFD700] text-sm font-bold uppercase tracking-widest rounded hover:bg-[#FFD700] hover:text-[#1a1a1a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              >
                Edit
              </Link>
            )}
            {robot.validationStatus === 'approved' && (
              <Link
                href={`/battles?challenge=${robot.id}`}
                className="px-4 py-2 bg-[#FF6B00] text-white text-sm font-bold uppercase tracking-widest rounded hover:bg-[#cc5500] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              >
                Issue Challenge
              </Link>
            )}
          </div>
        )}

        {/* Battle history */}
        {robotBattles.length > 0 && (
          <section aria-label="Battle history">
            <h2 className="arena-heading text-lg text-white mb-3">Battle History</h2>
            <div className="space-y-2">
              {robotBattles.map((battle) => (
                <Link
                  key={battle.id}
                  href={`/battles/${battle.id}`}
                  className="flex items-center justify-between bg-[#242424] border border-[#3a3a3a] rounded p-3 hover:border-[#FFD700]/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                >
                  <span className="text-[#e8e8e8] text-sm capitalize">{battle.status}</span>
                  {battle.winnerId === robot.id && <span className="text-green-400 text-xs font-bold">WIN</span>}
                  {battle.status === 'completed' && battle.winnerId !== robot.id && battle.winnerId !== null && (
                    <span className="text-red-400 text-xs font-bold">LOSS</span>
                  )}
                  {battle.status === 'completed' && battle.winnerId === null && (
                    <span className="text-[#8a9aa8] text-xs font-bold">DRAW</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#8a9aa8] uppercase tracking-widest">{label}</p>
      <p className="text-[#e8e8e8] font-bold">{value}</p>
    </div>
  );
}
