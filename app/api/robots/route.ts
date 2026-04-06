import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRobotsByUser, createRobot } from '@/lib/cosmos';
import { validateRobot } from '@/lib/ai';
import { Robot, RobotStats, WeightClass } from '@/lib/types';
import { validateStats } from '@/lib/battle';
import { v4 as uuidv4 } from 'uuid';

const MAX_ROBOTS_PER_USER = 10;
const VALID_WEIGHT_CLASSES: WeightClass[] = ['Featherweight', 'Lightweight', 'Middleweight', 'Heavyweight'];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const robots = await getRobotsByUser(userId);
  return NextResponse.json(robots);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const existing = await getRobotsByUser(userId);
  if (existing.length >= MAX_ROBOTS_PER_USER) {
    return NextResponse.json({ error: `Maximum of ${MAX_ROBOTS_PER_USER} robots per user` }, { status: 400 });
  }

  const body = await req.json() as Partial<{
    name: string;
    tagline: string;
    description: string;
    weightClass: WeightClass;
    weaponType: string;
    armourType: string;
    movementType: string;
    stats: RobotStats;
  }>;

  const { name, tagline, description, weightClass, weaponType, armourType, movementType, stats } = body;

  if (!name?.trim() || !tagline?.trim() || !description?.trim() || !weaponType?.trim() || !armourType?.trim() || !movementType?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!weightClass || !VALID_WEIGHT_CLASSES.includes(weightClass)) {
    return NextResponse.json({ error: 'Invalid weight class' }, { status: 400 });
  }

  if (!stats) return NextResponse.json({ error: 'Stats required' }, { status: 400 });

  const statsError = validateStats(stats);
  if (statsError) return NextResponse.json({ error: statsError }, { status: 400 });

  const now = new Date().toISOString();
  const robot: Robot = {
    id: uuidv4(),
    userId,
    name: name.trim().slice(0, 60),
    tagline: tagline.trim().slice(0, 100),
    description: description.trim().slice(0, 500),
    weightClass,
    weaponType: weaponType.trim().slice(0, 80),
    armourType: armourType.trim().slice(0, 80),
    movementType: movementType.trim().slice(0, 80),
    stats,
    validationStatus: 'pending',
    validationNotes: null,
    wins: 0,
    losses: 0,
    draws: 0,
    locked: false,
    leagueId: null,
    createdAt: now,
    updatedAt: now,
  };

  const saved = await createRobot(robot);

  // Trigger async validation (fire-and-forget so the response returns immediately)
  validateRobot(saved).then(async (result) => {
    const { updateRobot } = await import('@/lib/cosmos');
    await updateRobot({
      ...saved,
      validationStatus: result.status,
      validationNotes: result.notes,
      updatedAt: new Date().toISOString(),
    });
  }).catch(() => { /* logged inside validateRobot */ });

  return NextResponse.json(saved, { status: 201 });
}
