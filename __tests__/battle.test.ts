import {
  calculateLeagueStandingsPoints,
  calculateStartingHp,
  createSeededRng,
  simulateBattle,
  validateStats,
} from '@/lib/battle';
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

function sequenceRng(values: number[], fallback = 0.5): () => number {
  let idx = 0;
  return () => {
    if (idx < values.length) {
      const value = values[idx];
      idx += 1;
      return value;
    }
    return fallback;
  };
}

describe('validateStats', () => {
  it('returns null for valid stats at cap', () => {
    const err = validateStats({
      weaponDamage: 10,
      armourRating: 10,
      speed: 5,
      aggression: 5,
      reliability: 5,
    });

    expect(err).toBeNull();
  });

  it('returns an error if total points exceed cap', () => {
    const err = validateStats({
      weaponDamage: 10,
      armourRating: 10,
      speed: 10,
      aggression: 4,
      reliability: 4,
    });

    expect(err).toContain('exceed cap');
  });

  it('returns an error if any stat is outside 1-10', () => {
    const err = validateStats({
      weaponDamage: 0,
      armourRating: 10,
      speed: 10,
      aggression: 7,
      reliability: 7,
    });

    expect(err).toContain('must be between 1 and 10');
  });
});

describe('battle utilities', () => {
  it('calculates starting HP from armour rating', () => {
    expect(calculateStartingHp(1)).toBe(55);
    expect(calculateStartingHp(8)).toBe(90);
  });

  it('creates deterministic RNG values for a fixed seed', () => {
    const rngA = createSeededRng(12345);
    const rngB = createSeededRng(12345);
    const rngC = createSeededRng(54321);

    const seqA = [rngA(), rngA(), rngA()];
    const seqB = [rngB(), rngB(), rngB()];
    const seqC = [rngC(), rngC(), rngC()];

    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
  });

  it('calculates league points as 3*wins + draws', () => {
    expect(calculateLeagueStandingsPoints(0, 0)).toBe(0);
    expect(calculateLeagueStandingsPoints(3, 2)).toBe(11);
  });
});

describe('simulateBattle', () => {
  it('produces a deterministic draw when every attack malfunctions', () => {
    const robot1 = makeRobot({
      id: 'r1',
      stats: { weaponDamage: 7, armourRating: 6, speed: 6, aggression: 9, reliability: 1 },
    });
    const robot2 = makeRobot({
      id: 'r2',
      name: 'Titan Claw',
      stats: { weaponDamage: 7, armourRating: 6, speed: 6, aggression: 9, reliability: 1 },
    });

    // Per round: attacker pick, malfunction check (always malfunction).
    const rng = sequenceRng([
      0.1, 0.1,
      0.1, 0.1,
      0.1, 0.1,
      0.1, 0.1,
      0.1, 0.1,
    ]);

    const result = simulateBattle(robot1, robot2, rng);

    expect(result.winnerId).toBeNull();
    expect(result.rounds).toHaveLength(5);
    expect(result.totalDamageDealt[robot1.id]).toBe(0);
    expect(result.totalDamageDealt[robot2.id]).toBe(0);
    expect(result.finalHp[robot1.id]).toBe(result.finalHp[robot2.id]);
    expect(result.rounds.every((r) => r.damageDealt === 0)).toBe(true);
  });

  it('awards the win to robot1 when robot1 consistently lands heavy hits', () => {
    const robot1 = makeRobot({
      id: 'r1',
      stats: { weaponDamage: 10, armourRating: 6, speed: 7, aggression: 10, reliability: 10 },
    });
    const robot2 = makeRobot({
      id: 'r2',
      name: 'Rust Reaper',
      stats: { weaponDamage: 3, armourRating: 1, speed: 3, aggression: 1, reliability: 10 },
    });

    // Per round for robot1 attack: attacker pick -> no malfunction -> high damage roll.
    const rng = sequenceRng([
      0.0, 0.9, 0.99,
      0.0, 0.9, 0.99,
      0.0, 0.9, 0.99,
      0.0, 0.9, 0.99,
      0.0, 0.9, 0.99,
    ]);

    const result = simulateBattle(robot1, robot2, rng);

    expect(result.winnerId).toBe(robot1.id);
    expect(result.rounds.length).toBeGreaterThanOrEqual(1);
    expect(result.rounds.length).toBeLessThanOrEqual(5);
    expect(result.totalDamageDealt[robot1.id]).toBeGreaterThan(result.totalDamageDealt[robot2.id]);
  });
});
