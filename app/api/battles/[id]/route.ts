import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBattleById, getRobotById, updateBattle, updateRobot } from '@/lib/cosmos';
import { generateBattleCommentary } from '@/lib/ai';
import { simulateBattle } from '@/lib/battle';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const battle = await getBattleById(id);
  if (!battle) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });

  if (battle.challengedUserId !== userId) {
    return NextResponse.json({ error: 'Only the challenged user can respond to this request' }, { status: 403 });
  }

  if (battle.status !== 'pending') {
    return NextResponse.json({ error: 'Battle is no longer awaiting a response' }, { status: 409 });
  }

  const body = (await req.json()) as Partial<{ action: 'accept' | 'decline' }>;
  const action = body.action;

  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'Action must be accept or decline' }, { status: 400 });
  }

  if (action === 'decline') {
    const declined = await updateBattle({
      ...battle,
      status: 'declined',
    });
    return NextResponse.json(declined);
  }

  const agreedAt = new Date().toISOString();
  const accepted = await updateBattle({
    ...battle,
    status: 'accepted',
    agreedAt,
  });

  await updateBattle({
    ...accepted,
    status: 'simulating',
  });

  const [challengerRobot, challengedRobot] = await Promise.all([
    getRobotById(battle.challengerRobotId, battle.challengerUserId),
    getRobotById(battle.challengedRobotId, battle.challengedUserId),
  ]);

  if (!challengerRobot || !challengedRobot) {
    return NextResponse.json({ error: 'Battle robots could not be loaded' }, { status: 500 });
  }

  const result = simulateBattle(challengerRobot, challengedRobot);
  const commentary = await generateBattleCommentary(challengerRobot, challengedRobot, result);
  const completedAt = new Date().toISOString();

  const completed = await updateBattle({
    ...accepted,
    status: 'completed',
    winnerId: result.winnerId,
    rounds: result.rounds,
    totalDamageDealt: result.totalDamageDealt,
    commentary,
    completedAt,
  });

  if (result.winnerId === null) {
    await Promise.all([
      updateRobot({
        ...challengerRobot,
        draws: challengerRobot.draws + 1,
        locked: true,
        updatedAt: completedAt,
      }),
      updateRobot({
        ...challengedRobot,
        draws: challengedRobot.draws + 1,
        locked: true,
        updatedAt: completedAt,
      }),
    ]);
  } else if (result.winnerId === challengerRobot.id) {
    await Promise.all([
      updateRobot({
        ...challengerRobot,
        wins: challengerRobot.wins + 1,
        locked: true,
        updatedAt: completedAt,
      }),
      updateRobot({
        ...challengedRobot,
        losses: challengedRobot.losses + 1,
        locked: true,
        updatedAt: completedAt,
      }),
    ]);
  } else {
    await Promise.all([
      updateRobot({
        ...challengerRobot,
        losses: challengerRobot.losses + 1,
        locked: true,
        updatedAt: completedAt,
      }),
      updateRobot({
        ...challengedRobot,
        wins: challengedRobot.wins + 1,
        locked: true,
        updatedAt: completedAt,
      }),
    ]);
  }

  return NextResponse.json(completed);
}