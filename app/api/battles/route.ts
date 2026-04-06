import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBattlesByUser, getRobotById, createBattle, getAllRobots } from '@/lib/cosmos';
import { Battle } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const battles = await getBattlesByUser(userId);
  return NextResponse.json(battles);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const body = await req.json() as { challengerRobotId?: string; challengedRobotId?: string };
  const { challengerRobotId, challengedRobotId } = body;

  if (!challengerRobotId || !challengedRobotId) {
    return NextResponse.json({ error: 'challengerRobotId and challengedRobotId are required' }, { status: 400 });
  }

  if (challengerRobotId === challengedRobotId) {
    return NextResponse.json({ error: 'A robot cannot challenge itself' }, { status: 400 });
  }

  // Verify challenger robot is owned by calling user
  const challenger = await getRobotById(challengerRobotId, userId);
  if (!challenger || challenger.userId !== userId) {
    return NextResponse.json({ error: 'Challenger robot not found or not owned by you' }, { status: 400 });
  }

  if (challenger.validationStatus !== 'approved') {
    return NextResponse.json({ error: 'Challenger robot must be approved before issuing a challenge' }, { status: 400 });
  }

  // Find the challenged robot (any owner) using admin scan
  const all = await getAllRobots();
  const challenged = all.find((r) => r.id === challengedRobotId);
  if (!challenged) return NextResponse.json({ error: 'Challenged robot not found' }, { status: 404 });
  if (challenged.validationStatus !== 'approved') {
    return NextResponse.json({ error: 'Challenged robot is not approved' }, { status: 400 });
  }
  if (challenged.userId === userId) {
    return NextResponse.json({ error: 'Cannot challenge your own robot' }, { status: 400 });
  }

  const battle: Battle = {
    id: uuidv4(),
    challengerRobotId,
    challengedRobotId,
    challengerUserId: userId,
    challengedUserId: challenged.userId,
    status: 'pending',
    winnerId: null,
    rounds: [],
    commentary: '',
    totalDamageDealt: {},
    agreedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  const saved = await createBattle(battle);
  return NextResponse.json(saved, { status: 201 });
}
