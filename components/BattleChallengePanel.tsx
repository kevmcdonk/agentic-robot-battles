'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type RobotChoice = {
  id: string;
  name: string;
  ownerDisplayName: string;
};

interface BattleChallengePanelProps {
  myRobots: RobotChoice[];
  opponentRobots: RobotChoice[];
}

export default function BattleChallengePanel({ myRobots, opponentRobots }: BattleChallengePanelProps) {
  const router = useRouter();
  const [challengerRobotId, setChallengerRobotId] = useState(myRobots[0]?.id ?? '');
  const [challengedRobotId, setChallengedRobotId] = useState(opponentRobots[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(challengerRobotId && challengedRobotId && !submitting),
    [challengerRobotId, challengedRobotId, submitting],
  );

  async function issueChallenge() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengerRobotId, challengedRobotId }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to issue challenge');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded border border-[#3a3a3a] bg-[#242424] p-4" aria-label="Issue battle request">
      <h2 className="arena-heading mb-3 text-lg text-[#FFD700]">Request a Battle</h2>

      <div className="space-y-3">
        <div>
          <label htmlFor="challenger-robot" className="mb-1 block text-xs font-bold uppercase tracking-widest text-[#e8e8e8]">
            Your Robot
          </label>
          <select
            id="challenger-robot"
            value={challengerRobotId}
            onChange={(e) => setChallengerRobotId(e.target.value)}
            className="w-full rounded border border-[#3a3a3a] bg-[#1a1a1a] px-3 py-2 text-white focus:border-[#FFD700] focus:outline-none"
          >
            {myRobots.length === 0 && <option value="">No approved robots available</option>}
            {myRobots.map((robot) => (
              <option key={robot.id} value={robot.id}>{robot.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="challenged-robot" className="mb-1 block text-xs font-bold uppercase tracking-widest text-[#e8e8e8]">
            Opponent Robot
          </label>
          <select
            id="challenged-robot"
            value={challengedRobotId}
            onChange={(e) => setChallengedRobotId(e.target.value)}
            className="w-full rounded border border-[#3a3a3a] bg-[#1a1a1a] px-3 py-2 text-white focus:border-[#FFD700] focus:outline-none"
          >
            {opponentRobots.length === 0 && <option value="">No eligible opponent robots found</option>}
            {opponentRobots.map((robot) => (
              <option key={robot.id} value={robot.id}>
                {robot.name} ({robot.ownerDisplayName})
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

        <button
          type="button"
          onClick={() => void issueChallenge()}
          disabled={!canSubmit}
          className="w-full rounded bg-[#FFD700] py-3 font-black uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-[#FF6B00] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
        >
          {submitting ? 'Sending…' : 'Send Battle Request'}
        </button>
      </div>
    </section>
  );
}