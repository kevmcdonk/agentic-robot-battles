import { Robot, BattleRound, SimulationResult } from './types';
import { logError } from './logger';

const MAX_DESCRIPTION_LENGTH = 500;

/**
 * Strip characters that could be used for prompt injection.
 * Caps length and removes control sequences.
 */
function sanitizeForPrompt(input: string, maxLength = MAX_DESCRIPTION_LENGTH): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>{}[\]]/g, '')        // remove brackets that could break delimiters
    .replace(/\binject\b|\bignore\b|\bsystem\b/gi, '') // block common injection phrases
    .trim();
}

function getOpenAIConfig() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o';

  if (!endpoint || !apiKey) {
    throw new Error('AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY environment variables are required');
  }

  return { endpoint, apiKey, deployment };
}

async function callOpenAI(systemPrompt: string, userContent: string): Promise<string> {
  const { endpoint, apiKey, deployment } = getOpenAIConfig();

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.8,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content ?? '';
}

// --- Robot Validation ---

export interface ValidationResult {
  status: 'approved' | 'rejected' | 'needs_revision';
  notes: string;
}

export interface RobotIdentitySuggestion {
  name: string;
  tagline: string;
}

export async function generateRobotIdentitySuggestion(input: {
  weightClass: Robot['weightClass'];
  weaponType?: string;
  armourType?: string;
  movementType?: string;
  description?: string;
}): Promise<RobotIdentitySuggestion> {
  const systemPrompt = `You create battle-ready robot identities for a Robot Wars-inspired arena.
Return ONLY valid JSON in this exact shape:
{ "name": "<robot name>", "tagline": "<short tagline>" }

Rules:
- Name must be 2-4 words, memorable, and realistic for a combat robot team entry.
- Tagline must be 4-10 words, punchy, and match the robot style.
- Keep name <= 60 chars and tagline <= 100 chars.
- No markdown, no extra keys, no commentary.`;

  const userContent = `Weight class: ${input.weightClass}
Weapon type: ${sanitizeForPrompt(input.weaponType ?? '', 100) || 'Unknown'}
Armour type: ${sanitizeForPrompt(input.armourType ?? '', 100) || 'Unknown'}
Movement type: ${sanitizeForPrompt(input.movementType ?? '', 100) || 'Unknown'}
Description: ${sanitizeForPrompt(input.description ?? '', 300) || 'No description provided'}`;

  try {
    const raw = await callOpenAI(systemPrompt, userContent);
    const parsed = JSON.parse(raw) as Partial<RobotIdentitySuggestion>;

    const name = (parsed.name ?? '').toString().trim().slice(0, 60);
    const tagline = (parsed.tagline ?? '').toString().trim().slice(0, 100);

    if (!name || !tagline) {
      throw new Error('Missing name or tagline in AI response');
    }

    return { name, tagline };
  } catch (error) {
    logError('Robot identity generation AI call failed', error);
    return {
      name: 'Steel Tempest',
      tagline: 'Precision strikes, relentless pressure.',
    };
  }
}

export async function validateRobot(robot: Robot): Promise<ValidationResult> {
  const systemPrompt = `You are an expert combat robot validator for the Agentic Robot Battles arena,
inspired by UK Robot Wars (1990s–2000s). Your job is to assess whether a robot description is
physically plausible as a real-world build given its stated specs.

Respond ONLY with valid JSON in this exact shape:
{ "status": "approved" | "rejected" | "needs_revision", "notes": "<reason in one or two sentences>" }

Rules:
- "approved": description is physically plausible and stats match the weight class and build.
- "rejected": the robot is physically impossible or completely implausible.
- "needs_revision": mostly plausible but has inconsistencies (e.g. a featherweight described as 100 kg).`;

  const safeDescription = sanitizeForPrompt(robot.description);
  const safeWeapon = sanitizeForPrompt(robot.weaponType, 100);
  const safeArmour = sanitizeForPrompt(robot.armourType, 100);
  const safeMovement = sanitizeForPrompt(robot.movementType, 100);

  const userContent = `Robot name: ${sanitizeForPrompt(robot.name, 100)}
Weight class: ${robot.weightClass}
Weapon type: ${safeWeapon}
Armour type: ${safeArmour}
Movement type: ${safeMovement}
Description: ${safeDescription}
Stats (weaponDamage/armourRating/speed/aggression/reliability): ${robot.stats.weaponDamage}/${robot.stats.armourRating}/${robot.stats.speed}/${robot.stats.aggression}/${robot.stats.reliability}`;

  try {
    const raw = await callOpenAI(systemPrompt, userContent);
    const parsed = JSON.parse(raw) as ValidationResult;
    if (!['approved', 'rejected', 'needs_revision'].includes(parsed.status)) {
      throw new Error('Unexpected validation status from AI');
    }
    return parsed;
  } catch (error) {
    logError('Robot validation AI call failed', error, { robotId: robot.id });
    return { status: 'needs_revision', notes: 'Validation could not be completed. Please try again.' };
  }
}

// --- Battle Commentary ---

export async function generateBattleCommentary(
  robot1: Robot,
  robot2: Robot,
  result: SimulationResult,
): Promise<string> {
  const systemPrompt = `You are Jonathan Pearce, the legendary Robot Wars commentator from UK TV (1990s–2000s).
Write dramatic, exciting battle commentary (200–400 words) describing the fight vividly.
Reference specific robot features, weapons, and dramatic moments in the battle.
Do NOT include any HTML or markdown — plain prose only.`;

  const roundSummary = result.rounds
    .map(
      (r: BattleRound) =>
        `Round ${r.roundNumber}: ${r.description} Damage dealt: ${r.damageDealt}. Round winner: ${
          r.roundWinnerId === robot1.id ? robot1.name : r.roundWinnerId === robot2.id ? robot2.name : 'Neither'
        }`,
    )
    .join('\n');

  const winnerName =
    result.winnerId === robot1.id
      ? robot1.name
      : result.winnerId === robot2.id
        ? robot2.name
        : 'Neither (DRAW)';

  const userContent = `ROBOT 1 — ${sanitizeForPrompt(robot1.name, 100)}
Weight class: ${robot1.weightClass} | Weapon: ${sanitizeForPrompt(robot1.weaponType, 100)}
Armour: ${sanitizeForPrompt(robot1.armourType, 100)} | Movement: ${sanitizeForPrompt(robot1.movementType, 100)}
Description: ${sanitizeForPrompt(robot1.description)}
Stats: WD${robot1.stats.weaponDamage} AR${robot1.stats.armourRating} SP${robot1.stats.speed} AG${robot1.stats.aggression} RE${robot1.stats.reliability}

ROBOT 2 — ${sanitizeForPrompt(robot2.name, 100)}
Weight class: ${robot2.weightClass} | Weapon: ${sanitizeForPrompt(robot2.weaponType, 100)}
Armour: ${sanitizeForPrompt(robot2.armourType, 100)} | Movement: ${sanitizeForPrompt(robot2.movementType, 100)}
Description: ${sanitizeForPrompt(robot2.description)}
Stats: WD${robot2.stats.weaponDamage} AR${robot2.stats.armourRating} SP${robot2.stats.speed} AG${robot2.stats.aggression} RE${robot2.stats.reliability}

BATTLE LOG:
${roundSummary}

RESULT: ${winnerName} wins!
Damage dealt — ${robot1.name}: ${result.totalDamageDealt[robot1.id] ?? 0}, ${robot2.name}: ${result.totalDamageDealt[robot2.id] ?? 0}
Final HP — ${robot1.name}: ${result.finalHp[robot1.id]}, ${robot2.name}: ${result.finalHp[robot2.id]}`;

  try {
    return await callOpenAI(systemPrompt, userContent);
  } catch (error) {
    logError('Battle commentary AI call failed', error, {
      robot1Id: robot1.id,
      robot2Id: robot2.id,
    });
    return `An epic battle between ${robot1.name} and ${robot2.name} concluded with ${winnerName} victorious. The crowd went wild!`;
  }
}
