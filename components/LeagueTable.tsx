import { League } from '@/lib/types';

interface LeagueTableProps {
  league: League;
}

export default function LeagueTable({ league }: LeagueTableProps) {
  const sorted = [...league.standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    // Tiebreak 1: head-to-head is external; here use damage differential
    const diffA = a.damageDealt - a.damageReceived;
    const diffB = b.damageDealt - b.damageReceived;
    return diffB - diffA;
  });

  return (
    <section aria-label={`League table: ${league.name}`}>
      <h2 className="arena-heading text-[#FFD700] text-xl mb-1">{league.name}</h2>
      {league.description && (
        <p className="text-[#8a9aa8] text-sm mb-4">{league.description}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" aria-label={`Standings for ${league.name}`}>
          <thead>
            <tr className="border-b border-[#FFD700]/40">
              <th scope="col" className="text-left py-2 px-2 text-[#8a9aa8] font-bold uppercase text-xs tracking-widest w-8">#</th>
              <th scope="col" className="text-left py-2 px-2 text-[#8a9aa8] font-bold uppercase text-xs tracking-widest">Robot</th>
              <th scope="col" className="text-left py-2 px-2 text-[#8a9aa8] font-bold uppercase text-xs tracking-widest">Owner</th>
              <th scope="col" className="text-center py-2 px-2 text-[#8a9aa8] font-bold uppercase text-xs tracking-widest">W</th>
              <th scope="col" className="text-center py-2 px-2 text-[#8a9aa8] font-bold uppercase text-xs tracking-widest">D</th>
              <th scope="col" className="text-center py-2 px-2 text-[#8a9aa8] font-bold uppercase text-xs tracking-widest">L</th>
              <th scope="col" className="text-center py-2 px-2 text-[#8a9aa8] font-bold uppercase text-xs tracking-widest">Diff</th>
              <th scope="col" className="text-center py-2 px-2 text-[#FFD700] font-bold uppercase text-xs tracking-widest">Pts</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((standing, index) => {
              const diff = standing.damageDealt - standing.damageReceived;
              return (
                <tr
                  key={standing.robotId}
                  className={`border-b border-[#2a2a2a] ${index === 0 ? 'bg-[#FFD700]/5' : ''}`}
                >
                  <td className="py-2 px-2 text-[#8a9aa8]">{index + 1}</td>
                  <td className="py-2 px-2 font-bold text-[#e8e8e8]">{standing.robotName}</td>
                  <td className="py-2 px-2 text-[#8a9aa8]">{standing.ownerDisplayName}</td>
                  <td className="py-2 px-2 text-center text-green-400">{standing.wins}</td>
                  <td className="py-2 px-2 text-center text-[#8a9aa8]">{standing.draws}</td>
                  <td className="py-2 px-2 text-center text-red-400">{standing.losses}</td>
                  <td className="py-2 px-2 text-center text-[#8a9aa8]">{diff >= 0 ? `+${diff}` : diff}</td>
                  <td className="py-2 px-2 text-center font-black text-[#FFD700] text-base">{standing.points}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-[#8a9aa8] italic">
                  No robots in this league yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
