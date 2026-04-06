import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRobotById, updateRobot } from '@/lib/cosmos';
import { validateRobot } from '@/lib/ai';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = session.user as { roles?: string[] };
  const isAdmin = user.roles?.includes('admin') ?? false;

  // Owners can validate their own robots directly.
  let robot = await getRobotById(id, userId);

  // Admins can validate any robot by id.
  if (!robot && isAdmin) {
    const { getAllRobots } = await import('@/lib/cosmos');
    const all = await getAllRobots();
    robot = all.find((r) => r.id === id) ?? null;
  }

  if (!robot) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await validateRobot(robot);
  const updated = await updateRobot({
    ...robot,
    validationStatus: result.status,
    validationNotes: result.notes,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json(updated);
}
