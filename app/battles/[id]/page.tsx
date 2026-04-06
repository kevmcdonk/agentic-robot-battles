import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getBattleById, getRobotById } from '@/lib/cosmos';
import BattleCommentary from '@/components/BattleCommentary';
import AcceptDeclineButtons from './AcceptDeclineButtons';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BattlePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const userId = (session.user as { id: string }).id;
  const battle = await getBattleById(id);
  if (!battle) notFound();

  const isParticipant = battle.challengerUserId === userId || battle.challengedUserId === userId;
  const canWatch = battle.status === 'completed';
  if (!isParticipant && !canWatch) notFound();

  const [robot1, robot2] = await Promise.all([
    getRobotById(battle.challengerRobotId, battle.challengerUserId),
    getRobotById(battle.challengedRobotId, battle.challengedUserId),
  ]);

  if (!robot1 || !robot2) notFound();

  const isChallenged = battle.challengedUserId === userId;
  const canRespond = isChallenged && battle.status === 'pending';

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <p className="text-[#8a9aa8] text-xs mb-4">
          <Link href="/battles" className="hover:text-[#FFD700] focus:underline">Battles</Link>
          {' / '}
          <span className="text-[#e8e8e8]">{robot1.name} vs {robot2.name}</span>
        </p>

        <h1 className="arena-heading text-3xl text-[#FFD700] mb-6">
          {robot1.name} <span className="text-[#8a9aa8]">vs</span> {robot2.name}
        </h1>

        {/* Accept / Decline actions */}
        {canRespond && (
          <div className="mb-6 bg-[#242424] border border-[#FF6B00] rounded p-4" role="region" aria-label="Battle invite">
            <p className="text-[#e8e8e8] mb-3">
              <strong className="text-[#FFD700]">{robot1.name}</strong> has challenged your robot{' '}
              <strong className="text-[#FFD700]">{robot2.name}</strong> to a battle.
            </p>
            <AcceptDeclineButtons battleId={id} />
          </div>
        )}

        <BattleCommentary battle={battle} robot1={robot1} robot2={robot2} />
      </div>
    </main>
  );
}
