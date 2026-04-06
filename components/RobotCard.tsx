import { Robot } from '@/lib/types';

interface StatBarProps {
  label: string;
  value: number;
  max?: number;
}

export function StatBar({ label, value, max = 10 }: StatBarProps) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="mb-1">
      <div className="flex justify-between text-xs text-[#8a9aa8] mb-0.5">
        <span>{label}</span>
        <span aria-hidden="true">{value}/{max}</span>
      </div>
      <div
        className="stat-bar"
        role="meter"
        aria-label={`${label}: ${value} out of ${max}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className="stat-bar-fill" style={{ '--stat-bar-width': `${pct}%` } as React.CSSProperties} />
      </div>
    </div>
  );
}

const statusColour: Record<Robot['validationStatus'], string> = {
  pending: 'bg-[#555] text-white',
  approved: 'bg-green-700 text-white',
  rejected: 'bg-red-700 text-white',
  needs_revision: 'bg-yellow-600 text-black',
};

const statusIcon: Record<Robot['validationStatus'], string> = {
  pending: '⏳',
  approved: '✅',
  rejected: '✗',
  needs_revision: '⚠',
};

interface RobotCardProps {
  robot: Robot;
  href?: string;
}

export default function RobotCard({ robot, href }: RobotCardProps) {
  const card = (
    <div
      className="bg-[#242424] border border-[#3a3a3a] rounded p-4 hover:border-[#FFD700]/60 transition-colors"
      role="article"
      aria-label={`Robot: ${robot.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="arena-heading text-[#FFD700] text-lg leading-tight">{robot.name}</h2>
          <p className="text-[#8a9aa8] text-xs italic mt-0.5">{robot.tagline}</p>
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${statusColour[robot.validationStatus]}`}
          aria-label={`Validation status: ${robot.validationStatus}`}
        >
          {statusIcon[robot.validationStatus]} {robot.validationStatus.replace('_', ' ')}
        </span>
      </div>

      {/* Weight class + locked badge */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="text-xs bg-[#333] text-[#8a9aa8] px-2 py-0.5 rounded">{robot.weightClass}</span>
        {robot.locked && (
          <span className="text-xs bg-[#FF6B00]/20 text-[#FF6B00] px-2 py-0.5 rounded" aria-label="Robot is locked after competing">
            🔒 Locked
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="mb-3">
        <StatBar label="Weapon Damage" value={robot.stats.weaponDamage} />
        <StatBar label="Armour Rating" value={robot.stats.armourRating} />
        <StatBar label="Speed" value={robot.stats.speed} />
        <StatBar label="Aggression" value={robot.stats.aggression} />
        <StatBar label="Reliability" value={robot.stats.reliability} />
      </div>

      {/* W/D/L record */}
      <div className="flex gap-3 text-sm" aria-label={`Record: ${robot.wins} wins, ${robot.draws} draws, ${robot.losses} losses`}>
        <span className="text-green-400 font-bold">{robot.wins}W</span>
        <span className="text-[#8a9aa8] font-bold">{robot.draws}D</span>
        <span className="text-red-400 font-bold">{robot.losses}L</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block focus:outline-none focus:ring-2 focus:ring-[#FFD700] rounded">
        {card}
      </a>
    );
  }

  return card;
}
