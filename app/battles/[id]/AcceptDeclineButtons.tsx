'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AcceptDeclineButtons({ battleId }: { battleId: string }) {
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
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Request failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-red-400 text-sm mb-2" role="alert">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={() => respond('accept')}
          disabled={loading}
          className="flex-1 py-2 bg-green-700 text-white font-bold uppercase tracking-widest rounded hover:bg-green-600 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {loading ? '…' : 'Accept'}
        </button>
        <button
          onClick={() => respond('decline')}
          disabled={loading}
          className="flex-1 py-2 border border-red-700 text-red-400 font-bold uppercase tracking-widest rounded hover:bg-red-900/30 disabled:opacity-40 transition-colors focus:outline-none focus:ring-2 focus:ring-red-700"
        >
          {loading ? '…' : 'Decline'}
        </button>
      </div>
    </div>
  );
}
