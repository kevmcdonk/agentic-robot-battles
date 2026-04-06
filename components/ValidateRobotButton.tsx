'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ValidateRobotButton({ robotId }: { robotId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function triggerValidation() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/robots/${robotId}/validate`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to trigger validation');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void triggerValidation()}
        disabled={loading}
        className="rounded border border-[#FFD700] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#FFD700] transition-colors hover:bg-[#FFD700] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
      >
        {loading ? 'Validating…' : 'Validate'}
      </button>
      {error && <p className="text-[10px] text-red-400" role="alert">{error}</p>}
    </div>
  );
}