import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllRobots, getAllUserProfiles, getLeagueById, updateLeague, updateRobot } from '@/lib/cosmos';
import { LeagueStanding, Robot } from '@/lib/types';

const MAX_LEAGUE_ROBOTS = 10;

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isAdminSession(session: unknown): boolean {
  const user = (session as { user?: { roles?: string[] } } | null)?.user;
  return user?.roles?.includes('admin') ?? false;
}

function calculatePoints(wins: number, draws: number): number {
  return wins * 3 + draws;
}

function buildStandings(robots: Robot[], ownerDisplayByUserId: Record<string, string>): LeagueStanding[] {
  return robots
    .map((robot) => ({
      robotId: robot.id,
      robotName: robot.name,
      ownerDisplayName: ownerDisplayByUserId[robot.userId] ?? 'Unknown Owner',
      wins: robot.wins,
      losses: robot.losses,
      draws: robot.draws,
      points: calculatePoints(robot.wins, robot.draws),
      damageDealt: 0,
      damageReceived: 0,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.damageDealt - a.damageReceived;
      const diffB = b.damageDealt - b.damageReceived;
      return diffB - diffA;
    });
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const league = await getLeagueById(id);
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  const body = (await req.json()) as Partial<{
    name: string;
    description: string;
    robotIds: string[];
  }>;

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'League name is required' }, { status: 400 });

  const description = body.description?.trim() ?? '';
  const requestedRobotIds = Array.from(new Set(body.robotIds ?? []));
  if (requestedRobotIds.length > MAX_LEAGUE_ROBOTS) {
    return NextResponse.json({ error: `A league can contain at most ${MAX_LEAGUE_ROBOTS} robots` }, { status: 400 });
  }

  const [allRobots, userProfiles] = await Promise.all([getAllRobots(), getAllUserProfiles()]);
  const ownersById = Object.fromEntries(
    userProfiles.map((profile) => [profile.id, profile.displayName || profile.email]),
  );

  const selectedRobots = requestedRobotIds.map((robotId) => allRobots.find((robot) => robot.id === robotId)).filter(Boolean) as Robot[];
  if (selectedRobots.length !== requestedRobotIds.length) {
    return NextResponse.json({ error: 'One or more selected robots do not exist' }, { status: 400 });
  }

  const invalidRobot = selectedRobots.find((robot) => robot.validationStatus !== 'approved');
  if (invalidRobot) {
    return NextResponse.json({ error: `Robot ${invalidRobot.name} is not approved` }, { status: 400 });
  }

  const assignedElsewhere = selectedRobots.find((robot) => robot.leagueId && robot.leagueId !== league.id);
  if (assignedElsewhere) {
    return NextResponse.json({ error: `Robot ${assignedElsewhere.name} belongs to another league` }, { status: 400 });
  }

  const previousRobotIds = new Set(league.robotIds);
  const nextRobotIds = new Set(selectedRobots.map((robot) => robot.id));

  const robotsToRemove = allRobots.filter((robot) => previousRobotIds.has(robot.id) && !nextRobotIds.has(robot.id));
  const robotsToAssign = selectedRobots.filter((robot) => !previousRobotIds.has(robot.id));

  const now = new Date().toISOString();

  await Promise.all(
    robotsToRemove.map((robot) =>
      updateRobot({
        ...robot,
        leagueId: null,
        updatedAt: now,
      }),
    ),
  );

  await Promise.all(
    robotsToAssign.map((robot) =>
      updateRobot({
        ...robot,
        leagueId: league.id,
        updatedAt: now,
      }),
    ),
  );

  const updated = await updateLeague({
    ...league,
    name: name.slice(0, 80),
    description: description.slice(0, 300),
    robotIds: selectedRobots.map((robot) => robot.id),
    standings: buildStandings(selectedRobots, ownersById),
    updatedAt: now,
  });

  return NextResponse.json(updated);
}