'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { WeightClass, RobotStats } from '@/lib/types';
import { StatBar } from '@/components/RobotCard';

const WEIGHT_CLASSES: WeightClass[] = ['Featherweight', 'Lightweight', 'Middleweight', 'Heavyweight'];
const STAT_CAP = 35;
const STAT_NAMES: (keyof RobotStats)[] = ['weaponDamage', 'armourRating', 'speed', 'aggression', 'reliability'];
const STAT_LABELS: Record<keyof RobotStats, string> = {
  weaponDamage: 'Weapon Damage',
  armourRating: 'Armour Rating',
  speed: 'Speed',
  aggression: 'Aggression',
  reliability: 'Reliability',
};

const emptyStats: RobotStats = {
  weaponDamage: 5,
  armourRating: 5,
  speed: 5,
  aggression: 5,
  reliability: 5,
};

export default function NewRobotPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [generatingIdentity, setGeneratingIdentity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [weightClass, setWeightClass] = useState<WeightClass>('Middleweight');
  const [weaponType, setWeaponType] = useState('');
  const [armourType, setArmourType] = useState('');
  const [movementType, setMovementType] = useState('');
  const [stats, setStats] = useState<RobotStats>({ ...emptyStats });

  if (status === 'unauthenticated') {
    router.replace('/');
    return null;
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-[#8a9aa8]">Loading…</div>;
  }

  const totalStats = Object.values(stats).reduce((a, b) => a + b, 0);
  const statOverCap = totalStats > STAT_CAP;

  function setStat(key: keyof RobotStats, value: number) {
    setStats((prev) => ({ ...prev, [key]: Math.max(1, Math.min(10, value)) }));
  }

  async function handleSubmit() {
    if (statOverCap) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/robots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tagline, description, weightClass, weaponType, armourType, movementType, stats }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to create robot');
      }
      const robot = await res.json() as { id: string };
      router.push(`/robots/${robot.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setSubmitting(false);
    }
  }

  async function handleGenerateIdentity() {
    setGeneratingIdentity(true);
    setError(null);

    try {
      const res = await fetch('/api/robots/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weightClass,
          weaponType,
          armourType,
          movementType,
          description,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to generate robot identity');
      }

      const suggestion = await res.json() as { name: string; tagline: string };
      setName(suggestion.name);
      setTagline(suggestion.tagline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setGeneratingIdentity(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="arena-heading text-3xl text-[#FFD700] mb-2">Build Your Robot</h1>
        <p className="text-[#8a9aa8] text-sm mb-6">Step {step} of 3</p>

        {/* Step indicators */}
        <div className="flex gap-2 mb-8" role="list" aria-label="Form steps">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              role="listitem"
              aria-current={step === s ? 'step' : undefined}
              className={`flex-1 h-1 rounded ${step >= s ? 'bg-[#FFD700]' : 'bg-[#3a3a3a]'}`}
            />
          ))}
        </div>

        {/* Step 1 — Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <Field label="Robot Name *" hint="Max 60 characters">
              <input
                type="text"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]"
                placeholder="e.g. Titanium Fury"
              />
            </Field>
            <Field label="Tagline *" hint="One punchy line">
              <input
                type="text"
                maxLength={100}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]"
                placeholder="e.g. Fear the flip"
              />
            </Field>
            <button
              type="button"
              onClick={handleGenerateIdentity}
              disabled={generatingIdentity}
              className="w-full py-3 border border-[#FFD700] text-[#FFD700] font-bold uppercase tracking-widest rounded hover:bg-[#FFD700] hover:text-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            >
              {generatingIdentity ? 'Generating…' : 'AI Generate Name + Tagline'}
            </button>
            <Field label="Weight Class *">
              <select
                value={weightClass}
                onChange={(e) => setWeightClass(e.target.value as WeightClass)}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]"
                aria-label="Weight Class"
              >
                {WEIGHT_CLASSES.map((wc) => (
                  <option key={wc} value={wc}>{wc}</option>
                ))}
              </select>
            </Field>
            <button
              onClick={() => setStep(2)}
              disabled={!name.trim() || !tagline.trim()}
              className="w-full py-3 bg-[#FFD700] text-[#1a1a1a] font-black uppercase tracking-widest rounded hover:bg-[#FF6B00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2 — Build */}
        {step === 2 && (
          <div className="space-y-4">
            <Field label="Description *" hint="Physical description — max 500 chars. Must be a plausible real-world build.">
              <textarea
                maxLength={500}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700] resize-none"
                placeholder="A low-slung wedge with a horizontal titanium spinner mounted at the front…"
              />
              <span className="text-xs text-[#8a9aa8]">{description.length}/500</span>
            </Field>
            <Field label="Weapon Type *">
              <input type="text" maxLength={80} value={weaponType} onChange={(e) => setWeaponType(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]"
                placeholder="e.g. Horizontal spinner" />
            </Field>
            <Field label="Armour Type *">
              <input type="text" maxLength={80} value={armourType} onChange={(e) => setArmourType(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]"
                placeholder="e.g. Hardox steel shell" />
            </Field>
            <Field label="Movement Type *">
              <input type="text" maxLength={80} value={movementType} onChange={(e) => setMovementType(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]"
                placeholder="e.g. Four-wheel drive" />
            </Field>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border border-[#3a3a3a] text-[#8a9aa8] rounded hover:border-[#FFD700] hover:text-[#FFD700] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]">← Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={!description.trim() || !weaponType.trim() || !armourType.trim() || !movementType.trim()}
                className="flex-1 py-3 bg-[#FFD700] text-[#1a1a1a] font-black uppercase tracking-widest rounded hover:bg-[#FF6B00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              >Next →</button>
            </div>
          </div>
        )}

        {/* Step 3 — Stats */}
        {step === 3 && (
          <div className="space-y-4">
            <div className={`text-sm font-bold px-3 py-2 rounded flex justify-between ${statOverCap ? 'bg-red-900/40 text-red-400' : 'bg-[#2a2a2a] text-[#FFD700]'}`} role="status" aria-live="polite">
              <span>Total stats</span>
              <span>{totalStats} / {STAT_CAP}</span>
            </div>

            {STAT_NAMES.map((key) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <label htmlFor={`stat-${key}`} className="text-[#e8e8e8]">{STAT_LABELS[key]}</label>
                  <span className="text-[#8a9aa8]">{stats[key]}</span>
                </div>
                <input
                  id={`stat-${key}`}
                  type="range"
                  min={1}
                  max={10}
                  value={stats[key]}
                  onChange={(e) => setStat(key, parseInt(e.target.value, 10))}
                  className="w-full accent-[#FFD700]"
                  aria-label={`${STAT_LABELS[key]}: ${stats[key]} out of 10`}
                />
                <StatBar label={STAT_LABELS[key]} value={stats[key]} />
              </div>
            ))}

            {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 border border-[#3a3a3a] text-[#8a9aa8] rounded hover:border-[#FFD700] hover:text-[#FFD700] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]">← Back</button>
              <button
                onClick={handleSubmit}
                disabled={submitting || statOverCap}
                className="flex-1 py-3 bg-[#FFD700] text-[#1a1a1a] font-black uppercase tracking-widest rounded hover:bg-[#FF6B00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
              >
                {submitting ? 'Submitting…' : 'Submit for Validation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#e8e8e8] mb-1 uppercase tracking-widest">{label}</label>
      {hint && <p className="text-xs text-[#8a9aa8] mb-1">{hint}</p>}
      {children}
    </div>
  );
}
