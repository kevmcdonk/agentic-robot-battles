'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function BattleRequestActions({ battleId }: { battleId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: 'accept' | 'decline') {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/battles/${battleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to respond to request');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-red-400" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void respond('accept')}
          disabled={loading}
          className="flex-1 rounded bg-green-700 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-green-600 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {loading ? '…' : 'Accept'}
        </button>
        <button
          type="button"
          onClick={() => void respond('decline')}
          disabled={loading}
          className="flex-1 rounded border border-red-700 px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-400 transition-colors hover:bg-red-900/30 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-700"
        >
          {loading ? '…' : 'Decline'}
        </button>
      </div>
    </div>
  );
}