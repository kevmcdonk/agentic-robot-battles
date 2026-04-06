'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Battle, Robot } from '@/lib/types';
import BattleArenaSimulator from './BattleArenaSimulator';

interface BattleCommentaryProps {
  battle: Battle;
  robot1: Robot;
  robot2: Robot;
}

const statusLabel: Record<Battle['status'], string> = {
  pending: 'Awaiting Acceptance',
  accepted: 'Accepted — Queued',
  declined: 'Declined',
  simulating: 'Simulating…',
  completed: 'Completed',
};

export default function BattleCommentary({ battle, robot1, robot2 }: BattleCommentaryProps) {
  const winner =
    battle.winnerId === robot1.id
      ? robot1
      : battle.winnerId === robot2.id
        ? robot2
        : null;

  const isCompleted = battle.status === 'completed' && battle.rounds.length > 0;
  const totalRounds = battle.rounds.length;

  const [playbackRound, setPlaybackRound] = useState(0);
  const [isPlaying, setIsPlaying] = useState(isCompleted);
  const [attackBeat, setAttackBeat] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const prevPlaybackRound = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setPlaybackRound(0);
    setIsPlaying(isCompleted);
  }, [isCompleted, battle.id]);

  // Stop speech when the component unmounts or the battle changes
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, [battle.id]);

  function toggleSpeech() {
    if (typeof window === 'undefined' || !window.speechSynthesis || !battle.commentary) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(battle.commentary);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }

  useEffect(() => {
    if (!isCompleted || !isPlaying) return;
    if (playbackRound >= totalRounds) return;

    const timer = setTimeout(() => {
      setPlaybackRound((prev) => {
        const next = Math.min(prev + 1, totalRounds);
        if (next !== prev) setAttackBeat((b) => !b);
        return next;
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [isCompleted, isPlaying, playbackRound, totalRounds]);

  useEffect(() => {
    prevPlaybackRound.current = playbackRound;
  }, [playbackRound]);

  const hpTimeline = useMemo(() => {
    const startHp1 = 50 + robot1.stats.armourRating * 5;
    const startHp2 = 50 + robot2.stats.armourRating * 5;

    const snapshots: Array<{ hp1: number; hp2: number }> = [{ hp1: startHp1, hp2: startHp2 }];

    let hp1 = startHp1;
    let hp2 = startHp2;

    for (const round of battle.rounds) {
      if (round.attackerRobotId === robot1.id) {
        hp2 = Math.max(0, hp2 - round.damageDealt);
      } else {
        hp1 = Math.max(0, hp1 - round.damageDealt);
      }
      snapshots.push({ hp1, hp2 });
    }

    return { snapshots, startHp1, startHp2 };
  }, [battle.rounds, robot1.id, robot1.stats.armourRating, robot2.id, robot2.stats.armourRating]);

  const timelineIndex = Math.min(playbackRound, totalRounds);
  const hpSnapshot = hpTimeline.snapshots[timelineIndex] ?? hpTimeline.snapshots[0];
  const activeRound = isCompleted && timelineIndex > 0 ? battle.rounds[timelineIndex - 1] : null;

  const roundHighlights = useMemo(() => {
    if (battle.rounds.length === 0) return [] as Array<{ title: string; detail: string; round: number }>;

    const robotNameById: Record<string, string> = {
      [robot1.id]: robot1.name,
      [robot2.id]: robot2.name,
    };

    const firstRound = battle.rounds[0];
    const firstDefenderId = firstRound.attackerRobotId === robot1.id ? robot2.id : robot1.id;

    const maxDamageRound = battle.rounds.reduce((best, current) =>
      current.damageDealt > best.damageDealt ? current : best,
    battle.rounds[0]);
    const maxDamageDefenderId = maxDamageRound.attackerRobotId === robot1.id ? robot2.id : robot1.id;

    const malfunctionRound = battle.rounds.find((round) => round.damageDealt === 0);

    const highlights: Array<{ title: string; detail: string; round: number }> = [
      {
        title: 'Opening Clash',
        detail: `${robotNameById[firstRound.attackerRobotId]} struck first against ${robotNameById[firstDefenderId]}.`,
        round: firstRound.roundNumber,
      },
      {
        title: 'Biggest Hit',
        detail: `${robotNameById[maxDamageRound.attackerRobotId]} landed ${maxDamageRound.damageDealt.toFixed(1)} damage on ${robotNameById[maxDamageDefenderId]}.`,
        round: maxDamageRound.roundNumber,
      },
    ];

    if (malfunctionRound) {
      highlights.push({
        title: 'Weapon Failure',
        detail: `${robotNameById[malfunctionRound.attackerRobotId]} failed to connect in that exchange.`,
        round: malfunctionRound.roundNumber,
      });
    }

    if (battle.status === 'completed') {
      const finalRound = battle.rounds[battle.rounds.length - 1];
      highlights.push({
        title: winner ? 'Finishing Sequence' : 'Final Decision',
        detail: winner
          ? `${winner.name} sealed the fight by round ${finalRound.roundNumber}.`
          : `The judges called it level after round ${finalRound.roundNumber}.`,
        round: finalRound.roundNumber,
      });
    }

    return highlights;
  }, [battle.rounds, battle.status, robot1.id, robot1.name, robot2.id, robot2.name, winner]);

  return (
    <section aria-label="Battle details">
      {/* Result banner */}
      {battle.status === 'completed' && (
        <div
          className="mb-6 p-4 rounded border border-[#FFD700] bg-[#1a1a1a] text-center"
          role="status"
          aria-live="polite"
        >
          {winner ? (
            <>
              <p className="text-[#8a9aa8] text-sm uppercase tracking-widest mb-1">Winner</p>
              <p className="arena-heading text-3xl winner-glow text-[#FFD700]">{winner.name}</p>
            </>
          ) : (
            <p className="arena-heading text-3xl text-[#8a9aa8]">⚔ DRAW ⚔</p>
          )}
        </div>
      )}

      {/* Status badge for non-completed battles */}
      {battle.status !== 'completed' && (
        <div className="mb-4 inline-block text-xs font-bold px-3 py-1 rounded bg-[#333] text-[#8a9aa8] uppercase tracking-widest">
          {statusLabel[battle.status]}
        </div>
      )}

      {/* Split-screen robot comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[robot1, robot2].map((robot) => (
          <div
            key={robot.id}
            className={`p-3 rounded border ${battle.winnerId === robot.id ? 'border-[#FFD700] bg-[#FFD700]/5' : 'border-[#3a3a3a] bg-[#242424]'}`}
            aria-label={`${robot.name} battle stats`}
          >
            <p className="arena-heading text-[#FFD700] text-sm mb-1">{robot.name}</p>
            <p className="text-[#8a9aa8] text-xs">{robot.weightClass}</p>
            <p className="text-[#8a9aa8] text-xs">{robot.weaponType}</p>

            {battle.status === 'completed' && (
              <div className="mt-3">
                <p className="text-[11px] text-[#8a9aa8] uppercase tracking-widest mb-1">Hull Integrity</p>
                <progress
                  className="battle-progress"
                  value={robot.id === robot1.id ? hpSnapshot.hp1 : hpSnapshot.hp2}
                  max={robot.id === robot1.id ? hpTimeline.startHp1 : hpTimeline.startHp2}
                  aria-label={`${robot.name} hull integrity`}
                />
                <p className="mt-1 text-[11px] text-white font-bold">
                  {robot.id === robot1.id ? hpSnapshot.hp1.toFixed(1) : hpSnapshot.hp2.toFixed(1)} HP
                </p>
              </div>
            )}

            {battle.status === 'completed' && (
              <p className="text-white text-xs mt-2 font-bold">
                Damage: {battle.totalDamageDealt[robot.id] ?? 0}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Animated arena rendering */}
      {battle.rounds.length > 0 && (
        <div className="mb-6 rounded border border-[#3a3a3a] bg-[#1d1d1d] p-4" aria-label="Animated arena simulation">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="arena-heading text-sm text-[#8a9aa8]">Arena Simulation</h3>
            <span className="text-[11px] uppercase tracking-widest text-[#8a9aa8]">
              {activeRound ? `Round ${activeRound.roundNumber}` : 'Awaiting first strike'}
            </span>
          </div>

          <div className="rounded border border-[#3a3a3a] bg-[#101010] overflow-hidden">
            <div className="grid grid-cols-3 items-center gap-2 border-b border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-[11px] uppercase tracking-widest text-[#8a9aa8]">
              <span className="truncate">{robot1.name}</span>
              <span className="text-center text-[#FFD700] font-bold">{activeRound ? `R${activeRound.roundNumber}` : 'R0'}</span>
              <span className="truncate text-right">{robot2.name}</span>
            </div>

            <div className="relative w-full overflow-hidden">
              <BattleArenaSimulator
                robot1={robot1}
                robot2={robot2}
                activeRound={activeRound}
                attackBeat={attackBeat}
                hpSnapshot={hpSnapshot}
                startHp1={hpTimeline.startHp1}
                startHp2={hpTimeline.startHp2}
              />
            </div>

            <div className="border-t border-[#2a2a2a] bg-[#121212] px-3 py-2 text-xs text-[#8a9aa8]" aria-live="polite">
              {activeRound ? activeRound.description : 'Press Play to run the simulation.'}
            </div>
          </div>

          <div className="mt-2 text-[10px] uppercase tracking-widest text-[#8a9aa8]">
            Matter.js physics simulation
          </div>
        </div>
      )}

      {/* Fight highlights */}
      {roundHighlights.length > 0 && (
        <div className="mb-6">
          <h3 className="arena-heading text-sm text-[#8a9aa8] mb-2">Fight Highlights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roundHighlights.map((highlight, index) => (
              <article
                key={`${highlight.title}-${index}`}
                className="rounded border border-[#3a3a3a] bg-[#242424] p-3"
                aria-label={`${highlight.title} in round ${highlight.round}`}
              >
                <p className="text-[11px] uppercase tracking-widest text-[#FFD700] mb-1">Round {highlight.round}</p>
                <p className="text-sm font-bold text-[#e8e8e8] mb-1">{highlight.title}</p>
                <p className="text-xs text-[#8a9aa8] leading-relaxed">{highlight.detail}</p>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Round-by-round log */}
      {battle.rounds.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="arena-heading text-sm text-[#8a9aa8]">Round Log</h3>

            {isCompleted && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#8a9aa8] uppercase tracking-widest">
                  Round {timelineIndex}/{totalRounds}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPlaybackRound(0);
                    setIsPlaying(true);
                  }}
                  className="rounded border border-[#3a3a3a] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#FFD700] hover:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                >
                  Replay
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  disabled={playbackRound >= totalRounds}
                  className="rounded border border-[#3a3a3a] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8a9aa8] hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            )}
          </div>

          {isCompleted && (
            <progress
              className="battle-progress battle-progress--timeline mb-3"
              value={timelineIndex}
              max={totalRounds}
              aria-label="Simulation progress"
            />
          )}

          <ol className="space-y-2">
            {battle.rounds.map((round, index) => {
              const revealed = !isCompleted || index < playbackRound;

              return (
              <li
                key={round.roundNumber}
                className={`flex items-start gap-3 text-sm transition-all duration-500 ${
                  revealed ? 'opacity-100 translate-y-0' : 'opacity-35 translate-y-1'
                }`}
                aria-label={`Round ${round.roundNumber}: ${round.description}`}
              >
                <span className="text-[#FFD700] font-bold shrink-0 w-6">R{round.roundNumber}</span>
                <span className="text-[#e8e8e8]">{round.description}</span>
              </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* AI Commentary */}
      {battle.commentary && (
        <div className="border-t border-[#3a3a3a] pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="arena-heading text-sm text-[#8a9aa8]">Commentary</h3>
            <button
              type="button"
              onClick={toggleSpeech}
              aria-label={isSpeaking ? 'Stop reading commentary' : 'Read commentary aloud'}
              aria-pressed={isSpeaking}
              className="flex items-center gap-1.5 rounded border border-[#3a3a3a] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8a9aa8] hover:border-[#FFD700] hover:text-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition-colors"
            >
              <span aria-hidden="true">{isSpeaking ? '⏹' : '🔊'}</span>
              {isSpeaking ? 'Stop' : 'Read Aloud'}
            </button>
          </div>
          <div
            className="text-[#e8e8e8] text-sm leading-relaxed whitespace-pre-wrap"
            aria-label="Battle commentary"
          >
            {battle.commentary}
          </div>
        </div>
      )}
    </section>
  );
}
