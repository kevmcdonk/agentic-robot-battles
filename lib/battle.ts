import { Robot, BattleRound, SimulationResult } from './types';

const STAT_CAP = 35;
const MAX_ROUNDS = 5;
const DAMAGE_VARIANCE_MIN = 0.7;
const DAMAGE_VARIANCE_MAX = 1.3;
const ARMOUR_DAMAGE_REDUCTION_FACTOR = 0.4;
const BASE_HP = 50;
const HP_PER_ARMOUR = 5;

export function validateStats(stats: Robot['stats']): string | null {
  const total =
    stats.weaponDamage +
    stats.armourRating +
    stats.speed +
    stats.aggression +
    stats.reliability;

  if (total > STAT_CAP) {
    return `Total stat points (${total}) exceed cap of ${STAT_CAP}`;
  }

  for (const [key, value] of Object.entries(stats)) {
    if (value < 1 || value > 10) {
      return `Stat "${key}" must be between 1 and 10`;
    }
  }

  return null;
}

export function calculateStartingHp(armourRating: number): number {
  return BASE_HP + armourRating * HP_PER_ARMOUR;
}

/**
 * Seeded pseudo-random number generator (mulberry32) for deterministic tests.
 * Returns a value in [0, 1).
 */
export function createSeededRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simulate a battle between two robots.
 * @param robot1 Challenger robot
 * @param robot2 Challenged robot
 * @param rng Optional RNG function for deterministic testing (defaults to Math.random)
 */
export function simulateBattle(
  robot1: Robot,
  robot2: Robot,
  rng: () => number = Math.random,
): SimulationResult {
  let hp1 = calculateStartingHp(robot1.stats.armourRating);
  let hp2 = calculateStartingHp(robot2.stats.armourRating);

  const rounds: BattleRound[] = [];
  const totalDamage: Record<string, number> = {
    [robot1.id]: 0,
    [robot2.id]: 0,
  };

  for (let roundNumber = 1; roundNumber <= MAX_ROUNDS; roundNumber++) {
    // Determine attacker via weighted coin-flip based on aggression
    const totalAggression = robot1.stats.aggression + robot2.stats.aggression;
    const robot1Attacks = rng() < robot1.stats.aggression / totalAggression;
    const attacker = robot1Attacks ? robot1 : robot2;
    const defender = robot1Attacks ? robot2 : robot1;

    let damageDealt = 0;
    let description = '';

    // Malfunction check: (11 - reliability) * 2% chance
    const malfunctionChance = (11 - attacker.stats.reliability) * 0.02;
    const malfunctioned = rng() < malfunctionChance;

    if (malfunctioned) {
      damageDealt = 0;
      description = `${attacker.name}'s weapon malfunctions — no damage dealt this round!`;
    } else {
      const rawDamage =
        attacker.stats.weaponDamage * (DAMAGE_VARIANCE_MIN + rng() * (DAMAGE_VARIANCE_MAX - DAMAGE_VARIANCE_MIN));
      const reduction = defender.stats.armourRating * ARMOUR_DAMAGE_REDUCTION_FACTOR;
      damageDealt = Math.max(0, Math.round((rawDamage - reduction) * 10) / 10);
      description = `${attacker.name} strikes ${defender.name} for ${damageDealt} damage.`;
    }

    // Apply damage
    if (attacker.id === robot1.id) {
      hp2 = Math.max(0, hp2 - damageDealt);
    } else {
      hp1 = Math.max(0, hp1 - damageDealt);
    }
    totalDamage[attacker.id] = (totalDamage[attacker.id] ?? 0) + damageDealt;

    // Determine round winner
    let roundWinnerId: string | null = null;
    if (damageDealt > 0) {
      roundWinnerId = attacker.id;
    }

    rounds.push({
      roundNumber,
      attackerRobotId: attacker.id,
      damageDealt,
      description,
      roundWinnerId,
    });

    // KO check
    if (hp1 <= 0 || hp2 <= 0) {
      break;
    }
  }

  // Determine overall winner
  let winnerId: string | null = null;

  if (hp1 <= 0 && hp2 > 0) {
    winnerId = robot2.id;
  } else if (hp2 <= 0 && hp1 > 0) {
    winnerId = robot1.id;
  } else if (hp1 !== hp2) {
    winnerId = hp1 > hp2 ? robot1.id : robot2.id;
  }
  // Equal HP → draw (winnerId stays null)

  return {
    rounds,
    winnerId,
    totalDamageDealt: totalDamage,
    finalHp: { [robot1.id]: hp1, [robot2.id]: hp2 },
  };
}

export function calculateLeagueStandingsPoints(wins: number, draws: number): number {
  return wins * 3 + draws * 1;
}
