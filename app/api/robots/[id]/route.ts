import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRobotById, updateRobot, deleteRobot } from '@/lib/cosmos';
import { validateStats } from '@/lib/battle';
import { RobotStats, WeightClass } from '@/lib/types';

const VALID_WEIGHT_CLASSES: WeightClass[] = ['Featherweight', 'Lightweight', 'Middleweight', 'Heavyweight'];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = session.user as { roles?: string[] };
  const isAdmin = user.roles?.includes('admin') ?? false;

  const robot = await getRobotById(id, userId);
  if (!robot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (robot.userId !== userId && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json(robot);
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const robot = await getRobotById(id, userId);
  if (!robot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (robot.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (robot.locked) return NextResponse.json({ error: 'Robot is locked and cannot be edited' }, { status: 409 });

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

  if (body.weightClass && !VALID_WEIGHT_CLASSES.includes(body.weightClass)) {
    return NextResponse.json({ error: 'Invalid weight class' }, { status: 400 });
  }

  if (body.stats) {
    const statsError = validateStats(body.stats);
    if (statsError) return NextResponse.json({ error: statsError }, { status: 400 });
  }

  const updated = await updateRobot({
    ...robot,
    name: body.name?.trim().slice(0, 60) ?? robot.name,
    tagline: body.tagline?.trim().slice(0, 100) ?? robot.tagline,
    description: body.description?.trim().slice(0, 500) ?? robot.description,
    weightClass: body.weightClass ?? robot.weightClass,
    weaponType: body.weaponType?.trim().slice(0, 80) ?? robot.weaponType,
    armourType: body.armourType?.trim().slice(0, 80) ?? robot.armourType,
    movementType: body.movementType?.trim().slice(0, 80) ?? robot.movementType,
    stats: body.stats ?? robot.stats,
    validationStatus: 'pending',  // re-validate on edit
    validationNotes: null,
    updatedAt: new Date().toISOString(),
  });

  // Re-trigger validation
  const { validateRobot } = await import('@/lib/ai');
  validateRobot(updated).then(async (result) => {
    await updateRobot({
      ...updated,
      validationStatus: result.status,
      validationNotes: result.notes,
      updatedAt: new Date().toISOString(),
    });
  }).catch(() => { /* logged inside validateRobot */ });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const robot = await getRobotById(id, userId);
  if (!robot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (robot.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (robot.locked) return NextResponse.json({ error: 'Robot is locked and cannot be deleted' }, { status: 409 });

  await deleteRobot(id, userId);
  return new NextResponse(null, { status: 204 });
}
