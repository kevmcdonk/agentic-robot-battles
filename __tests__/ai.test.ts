import { generateRobotIdentitySuggestion, validateRobot } from '@/lib/ai';
import { Robot } from '@/lib/types';

function makeRobot(overrides: Partial<Robot> = {}): Robot {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? 'robot-1',
    userId: overrides.userId ?? 'azure:1',
    name: overrides.name ?? 'Steel Tempest',
    tagline: overrides.tagline ?? 'Relentless pressure',
    description: overrides.description ?? 'Compact wedge bot with front spinner.',
    weightClass: overrides.weightClass ?? 'Middleweight',
    weaponType: overrides.weaponType ?? 'Horizontal spinner',
    armourType: overrides.armourType ?? 'Hardox',
    movementType: overrides.movementType ?? 'Four-wheel drive',
    stats: overrides.stats ?? {
      weaponDamage: 8,
      armourRating: 6,
      speed: 7,
      aggression: 8,
      reliability: 8,
    },
    validationStatus: overrides.validationStatus ?? 'approved',
    validationNotes: overrides.validationNotes ?? null,
    wins: overrides.wins ?? 0,
    losses: overrides.losses ?? 0,
    draws: overrides.draws ?? 0,
    locked: overrides.locked ?? false,
    leagueId: overrides.leagueId ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe('lib/ai fallbacks and parsing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AZURE_OPENAI_ENDPOINT: 'https://example.openai.azure.com',
      AZURE_OPENAI_KEY: 'test-key',
      AZURE_OPENAI_DEPLOYMENT: 'gpt-4o',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('parses identity suggestion from OpenAI JSON payload', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"name":"Iron Vortex","tagline":"Fast, brutal, unstoppable."}' } }],
      }),
    } as Response);

    const result = await generateRobotIdentitySuggestion({
      weightClass: 'Middleweight',
      weaponType: 'Spinner',
      armourType: 'Steel',
      movementType: 'Wheels',
      description: 'A compact aggressive design.',
    });

    expect(result).toEqual({
      name: 'Iron Vortex',
      tagline: 'Fast, brutal, unstoppable.',
    });
  });

  it('returns fallback identity when AI response is invalid JSON', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not json' } }],
      }),
    } as Response);

    const result = await generateRobotIdentitySuggestion({
      weightClass: 'Middleweight',
    });

    expect(result.name).toBe('Steel Tempest');
    expect(result.tagline).toBe('Precision strikes, relentless pressure.');
  });

  it('returns needs_revision fallback when validation call fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network unavailable'));

    const result = await validateRobot(makeRobot());

    expect(result.status).toBe('needs_revision');
    expect(result.notes).toContain('could not be completed');
  });
});
