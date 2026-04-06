# Agents Guide: Agentic Robot Battles (Next.js + TypeScript + Cosmos DB)

This document defines the implementation blueprint for building the Agentic Robot Battles web app. It should be used as the authoritative reference when generating, updating, or reviewing any part of this codebase.

## Current State
The repository currently contains an MVP Summit Bingo app (`package.json` name: `mvp-summit-bingo`). The authentication plumbing (NextAuth v4, Azure AD / GitHub / Facebook providers), Cosmos DB client, logger, and admin role pattern are all working and reusable. The bingo-specific types, routes, components, and game logic must be replaced with the Robot Battles domain.

## Project Goal
Build a Next.js web app where authenticated users can design and submit realistic combat robots — inspired by the Robot Wars TV series (UK, 1990s–2000s) — and pit them against each other in AI-generated battles. Each robot must pass an AI validation step to confirm it is a plausible real-world build before it can compete.

Battle outcomes are determined by a simulation engine that weighs robot stats and introduces controlled randomness. An AI agent generates a full round-by-round commentary for every fight. Results and league standings are stored in Cosmos DB and are visible to all authenticated users.

**Key constraints:**
- Battles do not require both participants to be online simultaneously.
- A battle only runs once both robots' owners have agreed to fight.
- League tables hold a maximum of 10 robots and rank them by points (3 for a win, 1 for a draw, 0 for a loss).
- Robots are locked from editing once they have competed in at least one battle.

## Required Tech Stack
- **Framework:** Next.js 16 (App Router, server components + server actions where appropriate)
- **Language:** TypeScript (strict mode)
- **Authentication:** NextAuth v4 — Microsoft Entra ID as primary provider; GitHub and Facebook as optional extras, all configured via environment variables
- **Database:** Azure Cosmos DB NoSQL API (`@azure/cosmos` v4)
- **Styling:** Tailwind CSS v4
- **AI / LLM:** Azure OpenAI (GPT-4o) for robot validation and battle commentary
- **Testing:** Jest 30 + React Testing Library
- **Hosting target:** Azure App Service or Azure Container Apps (Docker-friendly, 12-factor config)

## Core Functional Requirements

### 1. Authentication
- Users sign in with their Microsoft account (primary). GitHub and Facebook are optional extras enabled by env vars.
- No anonymous access beyond the public landing page.
- Sessions must persist securely using `NEXTAUTH_SECRET`.
- Admin role is granted by email allowlist (`ADMIN_EMAIL_ALLOWLIST` env var) or a custom role claim. Never trust a client-supplied admin flag.

### 2. Robot Builder
- Each user can own multiple robots (soft limit: 10 per user).
- A robot definition includes: name, tagline, physical description, weapon type, armour type, movement type, weight class, and five numeric stats (1–10 each): weapon damage, armour rating, speed, aggression, reliability.
- Total stat points are capped at 35 to prevent unbeatable builds.
- On submission the robot is queued for AI validation (status: `pending`). The AI checks that the description is physically plausible, the stats are internally consistent, and the robot matches its stated weight class.
- Validation outcomes: `approved`, `rejected` (with a human-readable reason), or `needs_revision`.
- Only `approved` robots can accept or issue battle challenges.
- Robots are **locked** (read-only) once they have fought at least one battle.

### 3. Battle System
- Any user can challenge another user's approved robot to a fight.
- The challenged user must explicitly accept or decline.
- Once accepted the battle is queued. A server-side action runs the simulation and writes the result. Neither user needs to be online.
- A battle result includes: winner, loser (or draw), per-round breakdown (up to 5 rounds), and a full prose commentary written by the AI.
- The commentary must reference specific robot features, weapons, and dramatic moments.
- Both robots' win/loss counters update immediately after the battle completes.

### 4. League Tables
- Leagues are created by admins and hold up to 10 robots.
- A robot can belong to at most one league at a time.
- Standings: 3 pts for a win, 1 pt for a draw, 0 for a loss. Tiebreak: head-to-head, then goal difference (total damage dealt minus received).
- League pages are publicly visible to all authenticated users.

### 5. Admin Panel
- Admins can: view all robots and their validation status, re-run validation, approve or reject robots manually, create and manage leagues, assign robots to leagues, trigger pending battles manually, and view all user activity.

## App Routes

| Route | Auth | Description |
|---|---|---|
| `/` | Public | Landing page: what Agentic Robot Battles is, sign-in CTA, example commentary excerpt. Redirects authenticated users to `/dashboard`. |
| `/dashboard` | Required | User's robots, pending battle invites, league position summary. |
| `/robots` | Required | List of the current user's robots with status badges. |
| `/robots/new` | Required | Multi-step robot builder form with live stat cap validation. |
| `/robots/[id]` | Required | Robot profile: stats, validation status, battle history. |
| `/robots/[id]/edit` | Required | Edit robot (locked if battles exist). |
| `/battles` | Required | All battles involving the current user's robots; filterable by status. |
| `/battles/[id]` | Required | Full battle page: stats matchup, round-by-round commentary, result banner. |
| `/leagues` | Required | Grid of all leagues with top-3 standings preview. |
| `/leagues/[id]` | Required | Full league table with all robots and match results. |
| `/admin` | Admin only | Admin dashboard: user list, robot moderation, league management, battle queue. |

## Data Model (Cosmos DB)

Use a single database (default name: `robot-battles`) with the following containers, each partitioned by `/id` unless noted.

### `robots` container  _(partition key: `/userId`)_
```typescript
interface Robot {
  id: string;                // uuid
  userId: string;            // provider:providerAccountId from NextAuth token
  name: string;
  tagline: string;
  description: string;       // free-text physical description (max 500 chars)
  weightClass: 'Featherweight' | 'Lightweight' | 'Middleweight' | 'Heavyweight';
  weaponType: string;        // e.g. "Horizontal spinner", "Flipper", "Crusher"
  armourType: string;        // e.g. "Hardox steel", "Titanium shell"
  movementType: string;      // e.g. "Four-wheel drive", "Tank tracks"
  stats: {
    weaponDamage: number;    // 1–10
    armourRating: number;    // 1–10
    speed: number;           // 1–10
    aggression: number;      // 1–10
    reliability: number;     // 1–10
    // sum must be ≤ 35
  };
  validationStatus: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  validationNotes: string | null;
  wins: number;
  losses: number;
  draws: number;
  locked: boolean;           // true once fights ≥ 1
  leagueId: string | null;
  createdAt: string;         // ISO 8601
  updatedAt: string;
}
```

### `battles` container  _(partition key: `/id`)_
```typescript
interface Battle {
  id: string;
  challengerRobotId: string;
  challengedRobotId: string;
  challengerUserId: string;
  challengedUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'simulating' | 'completed';
  winnerId: string | null;   // robotId, or null for draw
  rounds: BattleRound[];
  commentary: string;        // full AI prose narrative
  totalDamageDealt: Record<string, number>; // robotId → damage points
  agreedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface BattleRound {
  roundNumber: number;
  attackerRobotId: string;
  damageDealt: number;
  description: string;       // one-sentence round summary
  roundWinnerId: string | null;
}
```

### `leagues` container  _(partition key: `/id`)_
```typescript
interface League {
  id: string;
  name: string;
  description: string;
  robotIds: string[];        // max 10
  standings: LeagueStanding[];
  createdAt: string;
  updatedAt: string;
}

interface LeagueStanding {
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
```

### `users` container  _(partition key: `/id`)_
```typescript
interface UserProfile {
  id: string;                // provider:providerAccountId
  email: string;
  displayName: string;
  roles: ('admin' | 'player')[];
  createdAt: string;
  updatedAt: string;
}
```

## Battle Simulation Rules

1. A battle consists of up to 5 rounds.
2. Each round, determine the attacker via a weighted coin-flip: `P(robot1 attacks) = robot1.aggression / (robot1.aggression + robot2.aggression)`.
3. Damage dealt = `attacker.weaponDamage * random(0.7, 1.3)` rounded to 1 decimal.
4. Damage is reduced by `defender.armourRating * 0.4`.
5. Each robot starts with `hitPoints = 50 + (armourRating * 5)`. When a robot's HP reaches 0 the fight ends by KO before 5 rounds.
6. `reliability` stat introduces a malfunction risk: each round there is a `(11 - reliability) * 2%` chance the attacker's weapon fails, dealing 0 damage.
7. After 5 rounds, the robot with more HP remaining wins. Equal HP is a draw.
8. The overall battle winner is the robot that wins the most rounds (or has the KO).
9. The AI commentary prompt must receive: both robots' full definitions, the per-round damage log, and the final result. The output must be 200–400 words of dramatic prose in the style of Jonathan Pearce (Robot Wars commentator).

## Security and Authorization
- Use Microsoft identity claims to identify users. The stable user ID is `provider:providerAccountId` built in the JWT callback.
- Admin access is controlled exclusively by `ADMIN_EMAIL_ALLOWLIST` (comma-separated) checked server-side. Never expose this list to the client.
- All mutation API routes must re-validate the caller's session and ownership of the referenced resource.
- Robot IDs in API paths must be cross-checked against the `userId` on the document — never trust a client-supplied userId.
- AI prompt inputs (robot descriptions) must be length-capped and stripped of prompt-injection attempts before being sent to the LLM.
- Use parameterised Cosmos DB queries; never interpolate user input into query strings.

## API Contracts

All routes return `application/json`. Error shape: `{ error: string }`.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/robots` | User | List the caller's robots |
| POST | `/api/robots` | User | Create a new robot (triggers validation) |
| GET | `/api/robots/[id]` | User | Get a single robot (owner or admin) |
| PUT | `/api/robots/[id]` | Owner | Update robot (rejected if locked) |
| DELETE | `/api/robots/[id]` | Owner | Delete robot (rejected if locked) |
| POST | `/api/robots/[id]/validate` | Admin | Re-trigger AI validation |
| GET | `/api/battles` | User | List battles involving caller's robots |
| POST | `/api/battles` | User | Issue a challenge (`{ challengerRobotId, challengedRobotId }`) |
| PUT | `/api/battles/[id]` | Challenged user | Accept or decline (`{ action: 'accept' | 'decline' }`) |
| POST | `/api/battles/[id]/run` | Admin | Manually trigger simulation |
| GET | `/api/leagues` | User | List all leagues |
| GET | `/api/leagues/[id]` | User | Get league with full standings |
| POST | `/api/admin/leagues` | Admin | Create a league |
| PUT | `/api/admin/leagues/[id]` | Admin | Update league / assign robots |
| GET | `/api/admin/robots` | Admin | List all robots with validation status |
| PUT | `/api/admin/robots/[id]` | Admin | Manually approve or reject a robot |
| GET | `/api/admin/users` | Admin | List all users |

## Environment Variables

```env
# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Microsoft Entra ID (required)
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=common

# Optional auth providers
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# Cosmos DB
COSMOS_ENDPOINT=
COSMOS_KEY=
COSMOS_DATABASE=robot-battles
COSMOS_CONTAINER_ROBOTS=robots
COSMOS_CONTAINER_BATTLES=battles
COSMOS_CONTAINER_LEAGUES=leagues
COSMOS_CONTAINER_USERS=users

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_KEY=
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Admin access
ADMIN_EMAIL_ALLOWLIST=admin@example.com
```

## UX Requirements
- **Theme:** Dark, industrial, hardcore — inspired by Robot Wars UK (1990s–2000s). Colour palette: deep charcoal, brushed steel, hazard yellow (`#FFD700`), and warning orange. Typography should evoke arena signage (bold, uppercase headings). Avoid soft pastels or rounded consumer aesthetics.
- **Robot cards** display the robot image placeholder, weight class badge, stat bars, and win/loss record.
- **Battle page** uses a split-screen layout showing both robots, with the commentary displayed as a scrollable play-by-play feed beneath.
- **League tables** use a classic sports-standings table style.
- Accessibility:
  - All interactive elements keyboard-operable.
  - Focus-visible states on all focusable elements.
  - ARIA labels on stat bars, status badges, and battle result banners.
  - Colour is never the sole means of conveying status (use icons + colour).
- Mobile-first layout; the dashboard and battle page must be fully usable on a 375 px viewport.

## Testing Requirements
- **Unit tests** for the battle simulation engine (deterministic seed tests for each rule).
- **Unit tests** for robot stat validation (cap enforcement, weight class consistency).
- **Unit tests** for league standings calculation (points, tiebreak logic).
- **Component tests** (React Testing Library) for the robot builder form and BattleCommentary component.
- **API route tests** using `next-test-api-route-handler` or equivalent mocking of Cosmos DB and NextAuth session.
- Minimum coverage target: 80% for `lib/` modules.

## Delivery Checklist
- [ ] Repository renamed / `package.json` updated (`agentic-robot-battles`)
- [ ] Bingo-specific types, routes, components, and game logic removed
- [ ] `lib/types.ts` replaced with Robot Battles domain types
- [ ] `lib/cosmos.ts` updated for new containers (`robots`, `battles`, `leagues`, `users`)
- [ ] `lib/battle.ts` — simulation engine implemented and unit-tested
- [ ] `lib/ai.ts` — Azure OpenAI client for validation and commentary
- [ ] Public landing page (`/`) updated to Robot Battles theme
- [ ] Robot CRUD pages and API routes
- [ ] AI robot validation pipeline (async, status polling)
- [ ] Battle challenge flow (issue → accept/decline → simulate → display)
- [ ] League table pages and admin management
- [ ] Admin panel updated for new domain
- [ ] All referenced environment variables documented in `.env.example`
- [ ] Mobile-responsive UI on all pages
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run build`)

