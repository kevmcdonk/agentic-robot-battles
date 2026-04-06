# Agentic Robot Battles

Agentic Robot Battles is a Next.js 16 web app where authenticated users build realistic combat robots, submit them for AI plausibility checks, challenge other players, and follow simulated battles with AI-generated commentary.

This repository is the rebuilt Robot Battles experience that replaces the original MVP Summit Bingo app. The current codebase includes the Robot Battles domain model, Robot Wars-inspired UI, Cosmos DB persistence, authenticated app routes, battle simulation logic, and admin surfaces for moderation and league management.

## Stack

- Next.js 16 with App Router
- TypeScript (strict mode)
- NextAuth v4 for authentication
- Azure Cosmos DB NoSQL API via `@azure/cosmos`
- Tailwind CSS v4
- Azure OpenAI for robot validation and battle commentary
- Jest + React Testing Library

## Current App Areas

- Public landing page with Robot Battles branding and sign-in CTA
- Authenticated dashboard showing robots, pending battle invites, and league summary
- Robot builder, detail, and edit flows
- Battle challenge, accept/decline, and battle detail pages
- League listing and league detail pages
- Admin area for robot moderation and operational controls
- API routes for robots, battles, leagues, auth, and admin actions

## Core Concepts

### Robots

Each robot has a weight class, weapon type, armour type, movement type, descriptive metadata, and five numeric stats:

- `weaponDamage`
- `armourRating`
- `speed`
- `aggression`
- `reliability`

Robots are validated against a stat cap of `35` total points and are locked from editing after they have competed.

### Battles

Battles are simulated server-side for up to 5 rounds. The engine weights attack order by aggression, applies armour-based damage reduction, includes weapon malfunction risk based on reliability, and determines the winner by KO or remaining HP.

### AI Features

Azure OpenAI is used for:

- plausibility validation of robot submissions
- dramatic battle commentary generation

If Azure OpenAI is not configured, the app falls back gracefully, but AI-backed validation and commentary will be limited.

## Getting Started

### Prerequisites

- Node.js 20 or later
- An Azure Cosmos DB account using the NoSQL API
- At least one configured NextAuth provider
- Azure OpenAI credentials if you want full AI validation and commentary

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create a `.env.local` file in the repo root and add the following values:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Microsoft Entra ID (primary provider)
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

Notes:

- Microsoft Entra ID is the intended primary sign-in provider.
- GitHub and Facebook providers are optional and are enabled only when their credentials are present.
- Admin access is controlled server-side through `ADMIN_EMAIL_ALLOWLIST`.

### Generate `NEXTAUTH_SECRET`

Use one of the following commands and paste the output into `NEXTAUTH_SECRET` in `.env.local`.

Preferred (works cross-platform in Node projects):

```bash
npx auth secret
```

Alternative (if OpenSSL is installed):

```bash
openssl rand -base64 32
```

Keep this value private. If it changes, existing user sessions become invalid and users will need to sign in again.

### Cosmos DB containers

The app creates or expects these containers:

| Container | Partition key | Purpose |
|---|---|---|
| `robots` | `/userId` | User-owned combat robots |
| `battles` | `/id` | Battle records and commentary |
| `leagues` | `/id` | League membership and standings |
| `users` | `/id` | User profiles and roles |

### Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the app for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |

## Main Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Landing page and sign-in |
| `/dashboard` | Authenticated | Robot summary, invites, league snapshot |
| `/robots` | Authenticated | Current user's robots |
| `/robots/new` | Authenticated | Robot creation form |
| `/robots/[id]` | Authenticated | Robot profile and history |
| `/robots/[id]/edit` | Authenticated | Robot edit page when unlocked |
| `/battles` | Authenticated | User battle list |
| `/battles/[id]` | Authenticated | Battle detail and commentary |
| `/leagues` | Authenticated | League index |
| `/leagues/[id]` | Authenticated | League standings |
| `/admin` | Admin only | Admin dashboard |

## Testing

Run the automated test suite with:

```bash
npm test
```

For production readiness checks:

```bash
npm run build
```

## Deployment Notes

The app is designed to run cleanly on Azure-hosted Node.js environments such as:

- Azure App Service
- Azure Container Apps

Before deploying, make sure production values are set for:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- Cosmos DB connection settings
- Azure OpenAI settings
- OAuth callback URLs for any enabled auth providers

## Project Direction

The user experience is intentionally styled around classic UK Robot Wars: dark industrial surfaces, hazard-strip accents, bold arena typography, and match commentary as a central part of the product rather than a novelty layer.
