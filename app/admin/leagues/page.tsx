'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { League } from '@/lib/types';

type RobotSummary = {
  id: string;
  name: string;
  userId: string;
  ownerDisplayName: string;
  validationStatus: string;
  leagueId: string | null;
  wins: number;
  losses: number;
  draws: number;
};

type LeagueEditorState = {
  name: string;
  description: string;
  robotIds: string[];
};

const MAX_LEAGUE_ROBOTS = 10;

function sortRobotsForPicker(robots: RobotSummary[]): RobotSummary[] {
  return [...robots].sort((a, b) => a.name.localeCompare(b.name));
}

export default function AdminLeaguesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [leagues, setLeagues] = useState<League[]>([]);
  const [robots, setRobots] = useState<RobotSummary[]>([]);
  const [editors, setEditors] = useState<Record<string, LeagueEditorState>>({});

  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');
  const [newLeagueRobotIds, setNewLeagueRobotIds] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
      return;
    }

    if (status === 'authenticated') {
      const user = session.user as { roles?: string[] };
      if (!user.roles?.includes('admin')) {
        router.replace('/dashboard');
        return;
      }

      void loadData();
    }
  }, [status, session, router]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/leagues');
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to load admin league data');
      }

      const data = (await res.json()) as { leagues: League[]; robots: RobotSummary[] };
      setLeagues(data.leagues);
      setRobots(data.robots);

      const nextEditors: Record<string, LeagueEditorState> = {};
      for (const league of data.leagues) {
        nextEditors[league.id] = {
          name: league.name,
          description: league.description,
          robotIds: [...league.robotIds],
        };
      }
      setEditors(nextEditors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  const approvedUnassignedRobots = useMemo(
    () => sortRobotsForPicker(robots.filter((robot) => robot.validationStatus === 'approved' && !robot.leagueId)),
    [robots],
  );

  function toggleSelection(ids: string[], robotId: string): string[] {
    if (ids.includes(robotId)) {
      return ids.filter((id) => id !== robotId);
    }
    if (ids.length >= MAX_LEAGUE_ROBOTS) {
      return ids;
    }
    return [...ids, robotId];
  }

  function robotPickListForLeague(leagueId: string): RobotSummary[] {
    return sortRobotsForPicker(
      robots.filter((robot) =>
        robot.validationStatus === 'approved' && (!robot.leagueId || robot.leagueId === leagueId),
      ),
    );
  }

  async function handleCreateLeague() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLeagueName,
          description: newLeagueDescription,
          robotIds: newLeagueRobotIds,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to create league');
      }

      setNewLeagueName('');
      setNewLeagueDescription('');
      setNewLeagueRobotIds([]);
      setSuccess('League created.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLeague(leagueId: string) {
    const editor = editors[leagueId];
    if (!editor) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/leagues/${leagueId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editor),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to update league');
      }

      setSuccess('League updated.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-[#8a9aa8]">Loading…</div>;
  }

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="arena-heading text-3xl text-[#FFD700]">League Setup</h1>
          <p className="mt-1 text-sm text-[#8a9aa8]">Create leagues and manage robot assignments (max 10 per league).</p>
        </div>

        {error && (
          <p className="rounded border border-red-400/40 bg-red-900/30 p-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded border border-green-400/40 bg-green-900/20 p-3 text-sm text-green-300" role="status">
            {success}
          </p>
        )}

        <section className="rounded border border-[#3a3a3a] bg-[#242424] p-5" aria-label="Create new league">
          <h2 className="arena-heading mb-4 text-xl text-[#FFD700]">Create League</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-league-name" className="mb-1 block text-xs font-bold uppercase tracking-widest text-[#e8e8e8]">League Name</label>
              <input
                id="new-league-name"
                type="text"
                maxLength={80}
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                className="w-full rounded border border-[#3a3a3a] bg-[#1a1a1a] px-3 py-2 text-white focus:border-[#FFD700] focus:outline-none"
                placeholder="e.g. Steel Division"
              />
            </div>

            <div>
              <label htmlFor="new-league-description" className="mb-1 block text-xs font-bold uppercase tracking-widest text-[#e8e8e8]">Description</label>
              <textarea
                id="new-league-description"
                rows={2}
                maxLength={300}
                value={newLeagueDescription}
                onChange={(e) => setNewLeagueDescription(e.target.value)}
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#1a1a1a] px-3 py-2 text-white focus:border-[#FFD700] focus:outline-none"
                placeholder="Short description of this league"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#e8e8e8]">
                Assign Approved Robots ({newLeagueRobotIds.length}/{MAX_LEAGUE_ROBOTS})
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded border border-[#3a3a3a] bg-[#1a1a1a] p-3">
                {approvedUnassignedRobots.length === 0 && (
                  <p className="text-sm text-[#8a9aa8]">No unassigned approved robots available.</p>
                )}
                {approvedUnassignedRobots.map((robot) => (
                  <label key={robot.id} className="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1 hover:bg-[#2a2a2a]">
                    <span className="text-sm text-[#e8e8e8]">{robot.name} <span className="text-[#8a9aa8]">({robot.ownerDisplayName})</span></span>
                    <input
                      type="checkbox"
                      checked={newLeagueRobotIds.includes(robot.id)}
                      onChange={() => setNewLeagueRobotIds((ids) => toggleSelection(ids, robot.id))}
                      className="h-4 w-4 accent-[#FFD700]"
                      aria-label={`Assign ${robot.name} to new league`}
                    />
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateLeague}
              disabled={saving || !newLeagueName.trim()}
              className="w-full rounded bg-[#FFD700] py-3 font-black uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-[#FF6B00] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
            >
              {saving ? 'Saving…' : 'Create League'}
            </button>
          </div>
        </section>

        <section aria-label="Manage existing leagues" className="space-y-4">
          <h2 className="arena-heading text-xl text-white">Manage Existing Leagues</h2>

          {leagues.length === 0 && (
            <p className="rounded border border-dashed border-[#3a3a3a] bg-[#242424] p-6 text-center text-[#8a9aa8]">
              No leagues yet.
            </p>
          )}

          {leagues.map((league) => {
            const editor = editors[league.id];
            if (!editor) return null;

            const robotsForLeague = robotPickListForLeague(league.id);

            return (
              <article key={league.id} className="rounded border border-[#3a3a3a] bg-[#242424] p-5">
                <div className="space-y-4">
                  <div>
                    <label htmlFor={`league-name-${league.id}`} className="mb-1 block text-xs font-bold uppercase tracking-widest text-[#e8e8e8]">League Name</label>
                    <input
                      id={`league-name-${league.id}`}
                      type="text"
                      maxLength={80}
                      value={editor.name}
                      onChange={(e) => setEditors((prev) => ({
                        ...prev,
                        [league.id]: { ...prev[league.id], name: e.target.value },
                      }))}
                      className="w-full rounded border border-[#3a3a3a] bg-[#1a1a1a] px-3 py-2 text-white focus:border-[#FFD700] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={`league-description-${league.id}`} className="mb-1 block text-xs font-bold uppercase tracking-widest text-[#e8e8e8]">Description</label>
                    <textarea
                      id={`league-description-${league.id}`}
                      rows={2}
                      maxLength={300}
                      value={editor.description}
                      onChange={(e) => setEditors((prev) => ({
                        ...prev,
                        [league.id]: { ...prev[league.id], description: e.target.value },
                      }))}
                      className="w-full resize-none rounded border border-[#3a3a3a] bg-[#1a1a1a] px-3 py-2 text-white focus:border-[#FFD700] focus:outline-none"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#e8e8e8]">
                      Assigned Robots ({editor.robotIds.length}/{MAX_LEAGUE_ROBOTS})
                    </p>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded border border-[#3a3a3a] bg-[#1a1a1a] p-3">
                      {robotsForLeague.length === 0 && (
                        <p className="text-sm text-[#8a9aa8]">No eligible robots found.</p>
                      )}
                      {robotsForLeague.map((robot) => (
                        <label key={robot.id} className="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1 hover:bg-[#2a2a2a]">
                          <span className="text-sm text-[#e8e8e8]">{robot.name} <span className="text-[#8a9aa8]">({robot.ownerDisplayName})</span></span>
                          <input
                            type="checkbox"
                            checked={editor.robotIds.includes(robot.id)}
                            onChange={() => setEditors((prev) => ({
                              ...prev,
                              [league.id]: {
                                ...prev[league.id],
                                robotIds: toggleSelection(prev[league.id].robotIds, robot.id),
                              },
                            }))}
                            className="h-4 w-4 accent-[#FFD700]"
                            aria-label={`Assign ${robot.name} in ${league.name}`}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveLeague(league.id)}
                    disabled={saving || !editor.name.trim()}
                    className="w-full rounded bg-[#FFD700] py-3 font-black uppercase tracking-widest text-[#1a1a1a] transition-colors hover:bg-[#FF6B00] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  >
                    {saving ? 'Saving…' : 'Save League'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}