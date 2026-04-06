import { CosmosClient, Container, Database } from '@azure/cosmos';
import { Robot, Battle, League, UserProfile } from './types';
import { logError, logWarn } from './logger';

let client: CosmosClient | null = null;
let database: Database | null = null;
let initializationPromise: Promise<void> | null = null;

function getClient(): CosmosClient {
  if (!client) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const key = process.env.COSMOS_KEY;
    if (!endpoint || !key) {
      throw new Error('COSMOS_ENDPOINT and COSMOS_KEY environment variables are required');
    }
    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

function getDatabase(): Database {
  const dbName = process.env.COSMOS_DATABASE ?? 'robot-battles';
  if (!database) {
    database = getClient().database(dbName);
  }

  if (!initializationPromise) {
    initializationPromise = getClient()
      .databases.createIfNotExists({ id: dbName })
      .then((response) => {
        database = response.database;
      });
  }

  return database;
}

async function ensureCosmosResources(): Promise<void> {
  getDatabase();

  try {
    await initializationPromise;

    const containers: Array<{ name: string; partitionKey: string }> = [
      { name: process.env.COSMOS_CONTAINER_ROBOTS ?? 'robots', partitionKey: '/userId' },
      { name: process.env.COSMOS_CONTAINER_BATTLES ?? 'battles', partitionKey: '/id' },
      { name: process.env.COSMOS_CONTAINER_LEAGUES ?? 'leagues', partitionKey: '/id' },
      { name: process.env.COSMOS_CONTAINER_USERS ?? 'users', partitionKey: '/id' },
    ];

    await Promise.all(
      containers.map(({ name, partitionKey }) =>
        getDatabase().containers.createIfNotExists({
          id: name,
          partitionKey: { paths: [partitionKey] },
        }),
      ),
    );
  } catch (error) {
    logError('Failed to initialize Cosmos DB resources', error, {
      database: process.env.COSMOS_DATABASE ?? 'robot-battles',
    });
    initializationPromise = null;
    throw error;
  }
}

function getContainer(name: string): Container {
  return getDatabase().container(name);
}

function robotsContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_ROBOTS ?? 'robots');
}

function battlesContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_BATTLES ?? 'battles');
}

function leaguesContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_LEAGUES ?? 'leagues');
}

function usersContainer(): Container {
  return getContainer(process.env.COSMOS_CONTAINER_USERS ?? 'users');
}

// --- Robots ---

export async function getRobotsByUser(userId: string): Promise<Robot[]> {
  await ensureCosmosResources();
  const query = {
    query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
    parameters: [{ name: '@userId', value: userId }],
  };
  const { resources } = await robotsContainer().items.query<Robot>(query).fetchAll();
  return resources;
}

export async function getRobotById(id: string, userId: string): Promise<Robot | null> {
  await ensureCosmosResources();
  try {
    const { resource } = await robotsContainer().item(id, userId).read<Robot>();
    return resource ?? null;
  } catch (error) {
    logWarn('Failed to load robot by id', { id, error: String(error) });
    return null;
  }
}

export async function getAllRobots(): Promise<Robot[]> {
  await ensureCosmosResources();
  const { resources } = await robotsContainer().items.readAll<Robot>().fetchAll();
  return resources;
}

export async function createRobot(robot: Robot): Promise<Robot> {
  await ensureCosmosResources();
  const { resource } = await robotsContainer().items.create<Robot>(robot);
  if (!resource) {
    const error = new Error('Failed to create robot');
    logError('Robot create returned empty resource', error, { robotId: robot.id });
    throw error;
  }
  return resource;
}

export async function updateRobot(robot: Robot): Promise<Robot> {
  await ensureCosmosResources();
  const { resource } = await robotsContainer().items.upsert<Robot>(robot);
  if (!resource) {
    const error = new Error('Failed to update robot');
    logError('Robot upsert returned empty resource', error, { robotId: robot.id });
    throw error;
  }
  return resource;
}

export async function deleteRobot(id: string, userId: string): Promise<void> {
  await ensureCosmosResources();
  await robotsContainer().item(id, userId).delete();
}

// --- Battles ---

export async function getBattleById(id: string): Promise<Battle | null> {
  await ensureCosmosResources();
  try {
    const { resource } = await battlesContainer().item(id, id).read<Battle>();
    return resource ?? null;
  } catch (error) {
    logWarn('Failed to load battle by id', { id, error: String(error) });
    return null;
  }
}

export async function getBattlesByUser(userId: string): Promise<Battle[]> {
  await ensureCosmosResources();
  const query = {
    query:
      'SELECT * FROM c WHERE c.challengerUserId = @userId OR c.challengedUserId = @userId ORDER BY c.createdAt DESC',
    parameters: [{ name: '@userId', value: userId }],
  };
  const { resources } = await battlesContainer().items.query<Battle>(query).fetchAll();
  return resources;
}

export async function getAllBattles(): Promise<Battle[]> {
  await ensureCosmosResources();
  const { resources } = await battlesContainer().items.readAll<Battle>().fetchAll();
  return resources;
}

export async function createBattle(battle: Battle): Promise<Battle> {
  await ensureCosmosResources();
  const { resource } = await battlesContainer().items.create<Battle>(battle);
  if (!resource) {
    const error = new Error('Failed to create battle');
    logError('Battle create returned empty resource', error, { battleId: battle.id });
    throw error;
  }
  return resource;
}

export async function updateBattle(battle: Battle): Promise<Battle> {
  await ensureCosmosResources();
  const { resource } = await battlesContainer().items.upsert<Battle>(battle);
  if (!resource) {
    const error = new Error('Failed to update battle');
    logError('Battle upsert returned empty resource', error, { battleId: battle.id });
    throw error;
  }
  return resource;
}

// --- Leagues ---

export async function getAllLeagues(): Promise<League[]> {
  await ensureCosmosResources();
  const { resources } = await leaguesContainer().items.readAll<League>().fetchAll();
  return resources;
}

export async function getLeagueById(id: string): Promise<League | null> {
  await ensureCosmosResources();
  try {
    const { resource } = await leaguesContainer().item(id, id).read<League>();
    return resource ?? null;
  } catch (error) {
    logWarn('Failed to load league by id', { id, error: String(error) });
    return null;
  }
}

export async function createLeague(league: League): Promise<League> {
  await ensureCosmosResources();
  const { resource } = await leaguesContainer().items.create<League>(league);
  if (!resource) {
    const error = new Error('Failed to create league');
    logError('League create returned empty resource', error, { leagueId: league.id });
    throw error;
  }
  return resource;
}

export async function updateLeague(league: League): Promise<League> {
  await ensureCosmosResources();
  const { resource } = await leaguesContainer().items.upsert<League>(league);
  if (!resource) {
    const error = new Error('Failed to update league');
    logError('League upsert returned empty resource', error, { leagueId: league.id });
    throw error;
  }
  return resource;
}

// --- UserProfile ---

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  await ensureCosmosResources();
  try {
    const { resource } = await usersContainer().item(userId, userId).read<UserProfile>();
    return resource ?? null;
  } catch (error) {
    logWarn('Failed to load user profile', { userId, error: String(error) });
    return null;
  }
}

export async function upsertUserProfile(profile: UserProfile): Promise<UserProfile> {
  await ensureCosmosResources();
  const { resource } = await usersContainer().items.upsert<UserProfile>(profile);
  if (!resource) {
    const error = new Error('Failed to upsert user profile');
    logError('User profile upsert returned empty resource', error, { userId: profile.id });
    throw error;
  }
  return resource;
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  await ensureCosmosResources();
  const { resources } = await usersContainer().items.readAll<UserProfile>().fetchAll();
  return resources;
}

