export type WeightClass = 'Featherweight' | 'Lightweight' | 'Middleweight' | 'Heavyweight';

export type ValidationStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export type BattleStatus = 'pending' | 'accepted' | 'declined' | 'simulating' | 'completed';

export interface RobotStats {
  weaponDamage: number;   // 1–10
  armourRating: number;   // 1–10
  speed: number;          // 1–10
  aggression: number;     // 1–10
  reliability: number;    // 1–10
  // sum must be ≤ 35
}

export interface Robot {
  id: string;                        // uuid
  userId: string;                    // provider:providerAccountId from NextAuth token
  name: string;
  tagline: string;
  description: string;               // free-text physical description (max 500 chars)
  weightClass: WeightClass;
  weaponType: string;                // e.g. "Horizontal spinner", "Flipper", "Crusher"
  armourType: string;                // e.g. "Hardox steel", "Titanium shell"
  movementType: string;              // e.g. "Four-wheel drive", "Tank tracks"
  stats: RobotStats;
  validationStatus: ValidationStatus;
  validationNotes: string | null;
  wins: number;
  losses: number;
  draws: number;
  locked: boolean;                   // true once fights ≥ 1
  leagueId: string | null;
  createdAt: string;                 // ISO 8601
  updatedAt: string;
}

export interface BattleRound {
  roundNumber: number;
  attackerRobotId: string;
  damageDealt: number;
  description: string;               // one-sentence round summary
  roundWinnerId: string | null;
}

export interface Battle {
  id: string;
  challengerRobotId: string;
  challengedRobotId: string;
  challengerUserId: string;
  challengedUserId: string;
  status: BattleStatus;
  winnerId: string | null;           // robotId, or null for draw
  rounds: BattleRound[];
  commentary: string;                // full AI prose narrative
  totalDamageDealt: Record<string, number>; // robotId → damage points
  agreedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface LeagueStanding {
  robotId: string;
  robotName: string;
  ownerDisplayName: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  damageDealt: number;
  damageReceived: number;
}

export interface League {
  id: string;
  name: string;
  description: string;
  robotIds: string[];                // max 10
  standings: LeagueStanding[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;                        // provider:providerAccountId
  email: string;
  displayName: string;
  roles: ('admin' | 'player')[];
  createdAt: string;
  updatedAt: string;
}

// Simulation input/output types
export interface SimulationResult {
  rounds: BattleRound[];
  winnerId: string | null;
  totalDamageDealt: Record<string, number>;
  finalHp: Record<string, number>;
}
