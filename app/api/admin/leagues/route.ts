import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createLeague, getAllLeagues, getAllRobots, getAllUserProfiles, updateRobot } from '@/lib/cosmos';
import { League, LeagueStanding, Robot } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const MAX_LEAGUE_ROBOTS = 10;

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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [leagues, robots, userProfiles] = await Promise.all([
    getAllLeagues(),
    getAllRobots(),
    getAllUserProfiles(),
  ]);

  const ownersById = Object.fromEntries(
    userProfiles.map((profile) => [profile.id, profile.displayName || profile.email]),
  );

  const robotSummaries = robots.map((robot) => ({
    id: robot.id,
    name: robot.name,
    userId: robot.userId,
    ownerDisplayName: ownersById[robot.userId] ?? 'Unknown Owner',
    validationStatus: robot.validationStatus,
    leagueId: robot.leagueId,
    wins: robot.wins,
    losses: robot.losses,
    draws: robot.draws,
  }));

  return NextResponse.json({ leagues, robots: robotSummaries });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json()) as Partial<{
    name: string;
    description: string;
    robotIds: string[];
  }>;

  const name = body.name?.trim();
  const description = body.description?.trim() ?? '';
  const requestedRobotIds = Array.from(new Set(body.robotIds ?? []));

  if (!name) {
    return NextResponse.json({ error: 'League name is required' }, { status: 400 });
  }

  if (requestedRobotIds.length > MAX_LEAGUE_ROBOTS) {
    return NextResponse.json({ error: `A league can contain at most ${MAX_LEAGUE_ROBOTS} robots` }, { status: 400 });
  }

  const [allRobots, userProfiles] = await Promise.all([getAllRobots(), getAllUserProfiles()]);
  const ownersById = Object.fromEntries(
    userProfiles.map((profile) => [profile.id, profile.displayName || profile.email]),
  );

  const selectedRobots = requestedRobotIds.map((id) => allRobots.find((robot) => robot.id === id)).filter(Boolean) as Robot[];
  if (selectedRobots.length !== requestedRobotIds.length) {
    return NextResponse.json({ error: 'One or more selected robots do not exist' }, { status: 400 });
  }

  const invalidRobot = selectedRobots.find((robot) => robot.validationStatus !== 'approved');
  if (invalidRobot) {
    return NextResponse.json({ error: `Robot ${invalidRobot.name} is not approved` }, { status: 400 });
  }

  const alreadyAssigned = selectedRobots.find((robot) => robot.leagueId);
  if (alreadyAssigned) {
    return NextResponse.json({ error: `Robot ${alreadyAssigned.name} is already in another league` }, { status: 400 });
  }

  const now = new Date().toISOString();
  const league: League = {
    id: uuidv4(),
    name: name.slice(0, 80),
    description: description.slice(0, 300),
    robotIds: selectedRobots.map((robot) => robot.id),
    standings: buildStandings(selectedRobots, ownersById),
    createdAt: now,
    updatedAt: now,
  };

  const saved = await createLeague(league);

  await Promise.all(
    selectedRobots.map((robot) =>
      updateRobot({
        ...robot,
        leagueId: saved.id,
        updatedAt: now,
      }),
    ),
  );

  return NextResponse.json(saved, { status: 201 });
}