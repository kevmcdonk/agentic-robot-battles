'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Robot, WeightClass, RobotStats } from '@/lib/types';
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

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditRobotPage({ params }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [robotId, setRobotId] = useState<string | null>(null);
  const [robot, setRobot] = useState<Robot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [weightClass, setWeightClass] = useState<WeightClass>('Middleweight');
  const [weaponType, setWeaponType] = useState('');
  const [armourType, setArmourType] = useState('');
  const [movementType, setMovementType] = useState('');
  const [stats, setStats] = useState<RobotStats>({ weaponDamage: 5, armourRating: 5, speed: 5, aggression: 5, reliability: 5 });

  useEffect(() => {
    params.then(({ id }) => setRobotId(id));
  }, [params]);

  useEffect(() => {
    if (!robotId || status !== 'authenticated') return;
    fetch(`/api/robots/${robotId}`)
      .then((r) => r.json())
      .then((data: Robot) => {
        if (data.locked) {
          router.replace(`/robots/${robotId}`);
          return;
        }
        setRobot(data);
        setName(data.name);
        setTagline(data.tagline);
        setDescription(data.description);
        setWeightClass(data.weightClass);
        setWeaponType(data.weaponType);
        setArmourType(data.armourType);
        setMovementType(data.movementType);
        setStats(data.stats);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load robot.'); setLoading(false); });
  }, [robotId, status, router]);

  if (status === 'unauthenticated') { router.replace('/'); return null; }
  if (loading) return <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-[#8a9aa8]">Loading…</div>;
  if (!robot) return <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-red-400">{error ?? 'Robot not found.'}</div>;

  const totalStats = Object.values(stats).reduce((a, b) => a + b, 0);
  const statOverCap = totalStats > STAT_CAP;

  function setStat(key: keyof RobotStats, value: number) {
    setStats((prev) => ({ ...prev, [key]: Math.max(1, Math.min(10, value)) }));
  }

  async function handleSave() {
    if (statOverCap || !robotId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/robots/${robotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, tagline, description, weightClass, weaponType, armourType, movementType, stats }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Save failed');
      }
      router.push(`/robots/${robotId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="arena-heading text-3xl text-[#FFD700] mb-6">Edit Robot</h1>

        <div className="space-y-4">
          <Field label="Robot Name *" htmlFor="robot-name">
            <input type="text" id="robot-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter robot name"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]" />
          </Field>
          <Field label="Tagline *" htmlFor="robot-tagline">
            <input type="text" id="robot-tagline" maxLength={100} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Enter robot tagline"
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]" />
          </Field>
          <Field label="Weight Class *" htmlFor="robot-weight-class">
            <select id="robot-weight-class" title="Weight Class" aria-label="Weight Class" value={weightClass} onChange={(e) => setWeightClass(e.target.value as WeightClass)}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]">
              {WEIGHT_CLASSES.map((wc) => <option key={wc} value={wc}>{wc}</option>)}
            </select>
          </Field>
          <Field label="Description *" htmlFor="robot-description">
            <textarea id="robot-description" title="Description" aria-label="Description" placeholder="Describe the robot build, layout, and materials" maxLength={500} rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700] resize-none" />
            <span className="text-xs text-[#8a9aa8]">{description.length}/500</span>
          </Field>
          <Field label="Weapon Type *" htmlFor="robot-weapon-type">
            <input id="robot-weapon-type" type="text" title="Weapon Type" aria-label="Weapon Type" placeholder="e.g. Horizontal spinner" maxLength={80} value={weaponType} onChange={(e) => setWeaponType(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]" />
          </Field>
          <Field label="Armour Type *" htmlFor="robot-armour-type">
            <input id="robot-armour-type" type="text" title="Armour Type" aria-label="Armour Type" placeholder="e.g. Hardox steel" maxLength={80} value={armourType} onChange={(e) => setArmourType(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]" />
          </Field>
          <Field label="Movement Type *" htmlFor="robot-movement-type">
            <input id="robot-movement-type" type="text" title="Movement Type" aria-label="Movement Type" placeholder="e.g. Four-wheel drive" maxLength={80} value={movementType} onChange={(e) => setMovementType(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#FFD700]" />
          </Field>

          {/* Stats */}
          <div>
            <div className={`text-sm font-bold px-3 py-2 rounded flex justify-between mb-3 ${statOverCap ? 'bg-red-900/40 text-red-400' : 'bg-[#2a2a2a] text-[#FFD700]'}`} role="status" aria-live="polite">
              <span>Total stats</span>
              <span>{totalStats} / {STAT_CAP}</span>
            </div>
            {STAT_NAMES.map((key) => (
              <div key={key} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <label htmlFor={`stat-${key}`} className="text-[#e8e8e8]">{STAT_LABELS[key]}</label>
                  <span className="text-[#8a9aa8]">{stats[key]}</span>
                </div>
                <input id={`stat-${key}`} type="range" min={1} max={10} value={stats[key]}
                  onChange={(e) => setStat(key, parseInt(e.target.value, 10))}
                  className="w-full accent-[#FFD700]" aria-label={`${STAT_LABELS[key]}: ${stats[key]} out of 10`} />
                <StatBar label={STAT_LABELS[key]} value={stats[key]} />
              </div>
            ))}
          </div>

          {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => router.push(`/robots/${robotId}`)} className="flex-1 py-3 border border-[#3a3a3a] text-[#8a9aa8] rounded hover:border-[#FFD700] hover:text-[#FFD700] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || statOverCap}
              className="flex-1 py-3 bg-[#FFD700] text-[#1a1a1a] font-black uppercase tracking-widest rounded hover:bg-[#FF6B00] disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-bold text-[#e8e8e8] mb-1 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}
