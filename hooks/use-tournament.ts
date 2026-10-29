"use client";
import { useEffect, useState } from "react";
import { initialTournament, makeTeam } from "@/lib/default-data";
import { secondsLeft, isReversed } from "@/lib/scoring";
import { STORAGE_KEY, looksLikeTournament } from "@/lib/storage";
import type {
  CatchItem,
  Player,
  ScoreEntry,
  ScoringRule,
  Tournament,
} from "@/lib/types";

export function useTournament() {
  const [data, setData] = useState<Tournament>(() => initialTournament());
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (looksLikeTournament(parsed)) setData(parsed);
      }
    } catch {
      /* Corrupt local storage should never break the dashboard */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* quota/private browser */
      }
    }
  }, [data, loaded]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const remaining = secondsLeft(data.timer, now);
  useEffect(() => {
    if (data.timer.runningSince !== null && remaining === 0) {
      setData((p) => ({
        ...p,
        timer: { ...p.timer, runningSince: null, remainingSec: 0 },
      }));
    }
  }, [remaining, data.timer.runningSince]);
  const setMeta = (field: "title" | "usn" | "map", value: string) =>
    setData((p) => ({ ...p, [field]: value.slice(0, 120) }));
  const setRules = (rules: ScoringRule[]) => setData((p) => ({ ...p, rules }));
  const setTeamName = (id: string, name: string) =>
    setData((p) => ({
      ...p,
      teams: p.teams.map((t) =>
        t.id === id ? { ...t, name: name.slice(0, 42) } : t,
      ),
    }));
  const setTeamColor = (id: string, color: string) =>
    setData((p) => ({
      ...p,
      teams: p.teams.map((t) => (t.id === id ? { ...t, color } : t)),
    }));
  const setPlayer = (teamId: string, id: string, fields: Partial<Player>) =>
    setData((p) => ({
      ...p,
      teams: p.teams.map((t) =>
        t.id === teamId
          ? {
              ...t,
              players: t.players.map((pl) =>
                pl.id === id ? { ...pl, ...fields } : pl,
              ),
            }
          : t,
      ),
    }));
  const addPlayer = (teamId: string) =>
    setData((p) => ({
      ...p,
      teams: p.teams.map((t) =>
        t.id === teamId && t.players.length < 20
          ? {
              ...t,
              players: [
                ...t.players,
                {
                  id: crypto.randomUUID(),
                  username: "",
                  displayName: "",
                  checkedIn: false,
                },
              ],
            }
          : t,
      ),
    }));
  const removePlayer = (teamId: string, id: string) =>
    setData((p) => {
      if (p.entries.some((e) => e.playerId === id)) return p;
      return {
        ...p,
        teams: p.teams.map((t) =>
          t.id === teamId
            ? { ...t, players: t.players.filter((pl) => pl.id !== id) }
            : t,
        ),
      };
    });
  const addTeam = () =>
    setData((p) =>
      p.teams.length >= 12
        ? p
        : {
            ...p,
            teams: [
              ...p.teams,
              {
                ...makeTeam(p.teams.length + 1),
                id: crypto.randomUUID(),
                players: makeTeam(p.teams.length + 1).players.map((pl) => ({
                  ...pl,
                  id: crypto.randomUUID(),
                })),
              },
            ],
          },
    );
  const removeTeam = (id: string) =>
    setData((p) =>
      p.entries.some((e) => e.teamId === id)
        ? p
        : { ...p, teams: p.teams.filter((t) => t.id !== id) },
    );
  const addCatch = (teamId: string, playerId: string, details: CatchItem[]) => {
    if (details.length === 0) return;
    const selected = details.filter(
      (item) =>
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.pointsEach),
    );
    if (!selected.length) return;
    const delta = selected.reduce(
      (sum, item) => sum + item.pointsEach * item.quantity,
      0,
    );
    const entry: ScoreEntry = {
      id: crypto.randomUUID(),
      teamId,
      playerId,
      kind: "catch",
      delta,
      description: selected.map((i) => `${i.name} ×${i.quantity}`).join(", "),
      details: selected,
      createdAt: new Date().toISOString(),
    };
    setData((p) => ({ ...p, entries: [entry, ...p.entries] }));
  };
  const addManual = (
    teamId: string,
    playerId: string,
    delta: number,
    reason: string,
  ) => {
    if (
      !Number.isSafeInteger(delta) ||
      delta === 0 ||
      Math.abs(delta) > 1000000
    )
      return;
    setData((p) => ({
      ...p,
      entries: [
        {
          id: crypto.randomUUID(),
          teamId,
          playerId,
          kind: "manual",
          delta,
          description: reason.trim().slice(0, 200) || "Penyesuaian manual",
          createdAt: new Date().toISOString(),
        },
        ...p.entries,
      ],
    }));
  };
  const reverseEntry = (entryId: string) =>
    setData((p) => {
      const original = p.entries.find((e) => e.id === entryId);
      if (
        !original ||
        original.kind === "reversal" ||
        isReversed(p.entries, entryId)
      )
        return p;
      const reverse: ScoreEntry = {
        id: crypto.randomUUID(),
        teamId: original.teamId,
        playerId: original.playerId,
        kind: "reversal",
        delta: -original.delta,
        description: `Batal: ${original.description}`,
        reversesEntryId: entryId,
        createdAt: new Date().toISOString(),
      };
      return { ...p, entries: [reverse, ...p.entries] };
    });
  const startPause = () =>
    setData((p) => {
      const t = p.timer;
      if (t.runningSince === null) {
        if (t.remainingSec <= 0) return p;
        return { ...p, timer: { ...t, runningSince: Date.now() } };
      }
      return {
        ...p,
        timer: {
          ...t,
          remainingSec: secondsLeft(t, Date.now()),
          runningSince: null,
        },
      };
    });
  const resetTimer = () =>
    setData((p) => ({
      ...p,
      timer: {
        ...p.timer,
        runningSince: null,
        remainingSec: p.timer.durationSec,
      },
    }));
  const setDuration = (minutes: number) =>
    setData((p) => {
      const secs = Math.round(Math.min(1440, Math.max(1, minutes)) * 60);
      return {
        ...p,
        timer: { durationSec: secs, remainingSec: secs, runningSince: null },
      };
    });
  const resetScores = () => setData((p) => ({ ...p, entries: [] }));
  const importData = (value: unknown): boolean => {
    if (!looksLikeTournament(value)) return false;
    setData(value);
    return true;
  };
  const restoreDefaults = () => setData(initialTournament());
  return {
    data,
    loaded,
    remaining,
    setMeta,
    setRules,
    setTeamName,
    setTeamColor,
    setPlayer,
    addPlayer,
    removePlayer,
    addTeam,
    removeTeam,
    addCatch,
    addManual,
    reverseEntry,
    startPause,
    resetTimer,
    setDuration,
    resetScores,
    importData,
    restoreDefaults,
  };
}
export type TournamentStore = ReturnType<typeof useTournament>;
