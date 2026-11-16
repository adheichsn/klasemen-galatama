"use client";
import { useEffect, useState } from "react";
import type {
  ArenaData,
  ArenaEvent,
  EventStatus,
  EventMode,
  TieBreaker,
  FishRule,
  BonusRule,
  WrittenRule,
  FaqItem,
  Participant,
  Squad,
  ScoreEntry,
} from "@/lib/arena-types";
import { initialArena, newEvent, newId } from "@/lib/arena-data";
import {
  ARENA_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  validArena,
  migrateLegacy,
} from "@/lib/arena-storage";
import { isReversed, secondsLeft, validPoints } from "@/lib/arena-utils";
import {
  canAssignSquad,
  canSwitchMode,
  calculateCatch,
} from "@/lib/arena-rules";

export function useArena() {
  const [data, setData] = useState<ArenaData>(initialArena);
  const [ready, setReady] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ARENA_STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : null;
      if (validArena(parsed) && parsed.events.length) {
        setData(parsed);
      } else if (!stored) {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        const old: unknown = legacy ? JSON.parse(legacy) : null;
        const converted = migrateLegacy(old);
        if (converted) {
          setData(converted);
          setMigrated(true);
        }
      }
    } catch {
      /* invalid local data is ignored without touching legacy backup */
    }
    setNow(Date.now());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(ARENA_STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* browser storage unavailable */
      }
    }
  }, [ready, data]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const active =
    data.events.find((e) => e.id === data.activeEventId) || data.events[0];
  const remaining = active ? secondsLeft(active.timer, now || Date.now()) : 0;
  useEffect(() => {
    if (
      !ready ||
      !active ||
      active.timer.runningSince === null ||
      remaining > 0
    )
      return;
    setData((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === active.id
          ? { ...e, timer: { ...e.timer, remainingSec: 0, runningSince: null } }
          : e,
      ),
    }));
  }, [ready, active, remaining]);
  const update = (fn: (e: ArenaEvent) => ArenaEvent, allowFinished = false) =>
    setData((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === prev.activeEventId &&
        (allowFinished || e.status !== "finished")
          ? fn(e)
          : e,
      ),
    }));
  const setActive = (id: string) =>
    setData((prev) =>
      prev.events.some((e) => e.id === id)
        ? { ...prev, activeEventId: id }
        : prev,
    );
  const create = (mode: EventMode = "solo") => {
    const e = newEvent(
      mode === "solo" ? "Galatama Solo Baru" : "Galatama Squad Baru",
      mode,
    );
    setData((prev) => ({
      ...prev,
      activeEventId: e.id,
      events: [e, ...prev.events],
    }));
    return e.id;
  };
  const duplicate = (id: string) => {
    const source = data.events.find((e) => e.id === id);
    if (!source) return;
    const copiedBonuses = source.bonuses.map((b) => ({ ...b, id: newId() }));
    const tieBonusIndex = source.bonuses.findIndex(
      (b) => b.id === source.tieBonusId,
    );
    const copy: ArenaEvent = {
      ...source,
      id: newId(),
      title: `${source.title} (Salinan)`,
      status: "draft",
      published: false,
      createdAt: new Date().toISOString(),
      finishedAt: undefined,
      entries: [],
      participants: [],
      fish: source.fish.map((f) => ({ ...f, id: newId() })),
      bonuses: copiedBonuses,
      tieBonusId: tieBonusIndex >= 0 ? copiedBonuses[tieBonusIndex].id : null,
      writtenRules: source.writtenRules.map((r) => ({ ...r, id: newId() })),
      faqs: source.faqs.map((q) => ({ ...q, id: newId() })),
      squads: source.squads.map((s) => ({ ...s, id: newId() })),
      timer: {
        durationSec: source.timer.durationSec,
        remainingSec: source.timer.durationSec,
        runningSince: null,
      },
    };
    setData((prev) => ({
      ...prev,
      activeEventId: copy.id,
      events: [copy, ...prev.events],
    }));
  };
  const remove = (id: string) =>
    setData((prev) => {
      if (prev.events.length <= 1) return prev;
      const target = prev.events.find((e) => e.id === id);
      if (!target || target.status !== "draft" || target.entries.length > 0)
        return prev;
      const events = prev.events.filter((e) => e.id !== id);
      return {
        ...prev,
        events,
        activeEventId:
          prev.activeEventId === id ? events[0].id : prev.activeEventId,
      };
    });
  const field = <
    K extends keyof Pick<
      ArenaEvent,
      "title" | "subtitle" | "location" | "host" | "eventDate"
    >,
  >(
    key: K,
    value: ArenaEvent[K],
  ) =>
    update((e) => ({
      ...e,
      [key]: value.slice(0, key === "subtitle" ? 180 : 100),
    }));
  const mode = (value: EventMode) =>
    update((e) => (!canSwitchMode(e) ? e : { ...e, mode: value }));
  const setTie = (value: TieBreaker, bonusId: string | null) =>
    update((e) => ({ ...e, tieBreaker: value, tieBonusId: bonusId }));
  const publish = (value: boolean) =>
    update((e) => ({ ...e, published: value }), true);
  const status = (value: EventStatus) =>
    update((e) => {
      const changed = {
        ...e,
        status: value,
        finishedAt: value === "finished" ? new Date().toISOString() : undefined,
      };
      return value === "finished"
        ? {
            ...changed,
            timer: {
              ...e.timer,
              remainingSec: secondsLeft(e.timer, Date.now()),
              runningSince: null,
            },
          }
        : changed;
    }, true);
  const setDuration = (mins: number) =>
    update((e) => {
      const sec = Math.round(mins * 60);
      return Number.isSafeInteger(sec) && sec >= 60 && sec <= 86400
        ? {
            ...e,
            timer: { durationSec: sec, remainingSec: sec, runningSince: null },
          }
        : e;
    });
  const toggleTimer = () =>
    update((e) => {
      const t = e.timer;
      if (e.status !== "live") return e;
      return {
        ...e,
        timer:
          t.runningSince === null
            ? t.remainingSec > 0
              ? { ...t, runningSince: Date.now() }
              : t
            : {
                ...t,
                remainingSec: secondsLeft(t, Date.now()),
                runningSince: null,
              },
      };
    });
  const resetTimer = () =>
    update((e) => ({
      ...e,
      timer: {
        ...e.timer,
        remainingSec: e.timer.durationSec,
        runningSince: null,
      },
    }));
  const addFish = (name: string, points: number) => {
    if (!name.trim() || !validPoints(points)) return;
    update((e) =>
      e.fish.length >= 500
        ? e
        : {
            ...e,
            fish: [
              ...e.fish,
              {
                id: newId(),
                name: name.trim().slice(0, 70),
                points,
                enabled: true,
              },
            ],
          },
    );
  };
  const changeFish = (id: string, fields: Partial<FishRule>) =>
    update((e) => ({
      ...e,
      fish: e.fish.map((f) => (f.id === id ? { ...f, ...fields } : f)),
    }));
  const removeFish = (id: string) =>
    update((e) => ({ ...e, fish: e.fish.filter((f) => f.id !== id) }));
  const addBonus = (name: string, points: number) => {
    if (!name.trim() || !validPoints(points)) return;
    update((e) =>
      e.bonuses.length >= 200
        ? e
        : {
            ...e,
            bonuses: [
              ...e.bonuses,
              {
                id: newId(),
                name: name.trim().slice(0, 70),
                points,
                enabled: true,
              },
            ],
          },
    );
  };
  const changeBonus = (id: string, fields: Partial<BonusRule>) =>
    update((e) => ({
      ...e,
      bonuses: e.bonuses.map((b) => (b.id === id ? { ...b, ...fields } : b)),
    }));
  const removeBonus = (id: string) =>
    update((e) => ({ ...e, bonuses: e.bonuses.filter((b) => b.id !== id) }));
  const addRule = (group: string, content: string) => {
    if (!content.trim()) return;
    update((e) => ({
      ...e,
      writtenRules: [
        ...e.writtenRules,
        {
          id: newId(),
          group: group.trim().slice(0, 60) || "Umum",
          content: content.trim().slice(0, 1000),
        },
      ],
    }));
  };
  const changeRule = (id: string, fields: Partial<WrittenRule>) =>
    update((e) => ({
      ...e,
      writtenRules: e.writtenRules.map((r) =>
        r.id === id ? { ...r, ...fields } : r,
      ),
    }));
  const removeRule = (id: string) =>
    update((e) => ({
      ...e,
      writtenRules: e.writtenRules.filter((r) => r.id !== id),
    }));
  const addFaq = (question: string, answer: string) => {
    if (!question.trim() || !answer.trim()) return;
    update((e) => ({
      ...e,
      faqs: [
        ...e.faqs,
        {
          id: newId(),
          question: question.trim().slice(0, 250),
          answer: answer.trim().slice(0, 2000),
        },
      ],
    }));
  };
  const changeFaq = (id: string, fields: Partial<FaqItem>) =>
    update((e) => ({
      ...e,
      faqs: e.faqs.map((f) => (f.id === id ? { ...f, ...fields } : f)),
    }));
  const removeFaq = (id: string) =>
    update((e) => ({ ...e, faqs: e.faqs.filter((f) => f.id !== id) }));
  const addSquad = (name: string) => {
    if (!name.trim()) return;
    update((e) =>
      e.mode !== "squad"
        ? e
        : {
            ...e,
            squads: [
              ...e.squads,
              { id: newId(), name: name.trim().slice(0, 70), color: "#3478F6" },
            ],
          },
    );
  };
  const changeSquad = (id: string, fields: Partial<Squad>) =>
    update((e) => ({
      ...e,
      squads: e.squads.map((s) => (s.id === id ? { ...s, ...fields } : s)),
    }));
  const removeSquad = (id: string) =>
    update((e) =>
      e.participants.some((p) => p.squadId === id)
        ? e
        : { ...e, squads: e.squads.filter((s) => s.id !== id) },
    );
  const addParticipant = (
    name: string,
    username: string,
    squadId: string | null,
  ) => {
    if (!name.trim()) return;
    update((e) =>
      e.participants.length >= 2000 ||
      (e.mode === "squad" && !e.squads.some((s) => s.id === squadId))
        ? e
        : {
            ...e,
            participants: [
              ...e.participants,
              {
                id: newId(),
                name: name.trim().slice(0, 80),
                username: username.trim().replace(/^@/, "").slice(0, 80),
                checkedIn: false,
                squadId: e.mode === "squad" ? squadId : null,
              },
            ],
          },
    );
  };
  const changeParticipant = (id: string, fields: Partial<Participant>) =>
    update((e) => {
      const existing = e.participants.find((p) => p.id === id);
      if (!existing) return e;
      // Historical team ownership must not change when roster edits are made.
      if (
        fields.squadId !== undefined &&
        fields.squadId !== existing.squadId &&
        !canAssignSquad(e, id, fields.squadId)
      )
        return e;
      return {
        ...e,
        participants: e.participants.map((p) =>
          p.id === id
            ? {
                ...p,
                ...fields,
                squadId:
                  e.mode === "solo"
                    ? null
                    : fields.squadId === undefined
                      ? p.squadId
                      : fields.squadId,
              }
            : p,
        ),
      };
    });
  const removeParticipant = (id: string) =>
    update((e) =>
      e.entries.some((s) => s.participantId === id)
        ? e
        : { ...e, participants: e.participants.filter((p) => p.id !== id) },
    );
  const addCatch = (
    participantId: string,
    fishId: string,
    bonusIds: string[],
    quantity: number,
  ) => {
    const e = active;
    if (
      !e ||
      !e.participants.some((p) => p.id === participantId) ||
      e.status !== "live" ||
      (e.mode === "squad" &&
        !e.participants.find((p) => p.id === participantId)?.squadId)
    )
      return false;
    const result = calculateCatch(e, fishId, bonusIds, quantity);
    if (!result) return false;
    const { fish, bonuses, delta } = result;
    const entry: ScoreEntry = {
      id: newId(),
      participantId,
      squadId:
        e.mode === "squad"
          ? e.participants.find((p) => p.id === participantId)?.squadId
          : null,
      kind: "catch",
      delta,
      description: `${fish.name} ×${quantity}${bonuses.length ? ` • ${bonuses.map((b) => b.name).join(", ")}` : ""}`,
      fishId,
      fishName: fish.name,
      basePoints: fish.points,
      quantity,
      bonuses,
      createdAt: new Date().toISOString(),
    };
    update((event) => ({ ...event, entries: [entry, ...event.entries] }));
    return true;
  };
  const addManual = (participantId: string, points: number, reason: string) => {
    if (
      !validPoints(points) ||
      points === 0 ||
      !reason.trim() ||
      !active ||
      active.status !== "live" ||
      !active.participants.some(
        (p) =>
          p.id === participantId && (active.mode === "solo" || !!p.squadId),
      )
    )
      return false;
    const entry: ScoreEntry = {
      id: newId(),
      participantId,
      squadId:
        active.mode === "squad"
          ? active.participants.find((p) => p.id === participantId)?.squadId
          : null,
      kind: "manual",
      delta: points,
      description: reason.trim().slice(0, 300),
      createdAt: new Date().toISOString(),
    };
    update((e) => ({ ...e, entries: [entry, ...e.entries] }));
    return true;
  };
  const reverse = (id: string) =>
    update((e) => {
      const original = e.entries.find((en) => en.id === id);
      if (
        !original ||
        original.kind === "reversal" ||
        isReversed(e.entries, id) ||
        e.status !== "live"
      )
        return e;
      const reversal: ScoreEntry = {
        id: newId(),
        participantId: original.participantId,
        squadId:
          original.squadId ??
          e.participants.find((p) => p.id === original.participantId)?.squadId,
        kind: "reversal",
        delta: -original.delta,
        description: `Pembatalan: ${original.description}`,
        reversesEntryId: original.id,
        createdAt: new Date().toISOString(),
      };
      return { ...e, entries: [reversal, ...e.entries] };
    });
  const importBackup = (value: unknown) => {
    const candidate = validArena(value) ? value : migrateLegacy(value);
    if (!candidate || !candidate.events.length) return false;
    setData(candidate);
    return true;
  };
  return {
    data,
    active,
    ready,
    migrated,
    remaining,
    setActive,
    create,
    duplicate,
    remove,
    field,
    mode,
    setTie,
    publish,
    status,
    setDuration,
    toggleTimer,
    resetTimer,
    addFish,
    changeFish,
    removeFish,
    addBonus,
    changeBonus,
    removeBonus,
    addRule,
    changeRule,
    removeRule,
    addFaq,
    changeFaq,
    removeFaq,
    addSquad,
    changeSquad,
    removeSquad,
    addParticipant,
    changeParticipant,
    removeParticipant,
    addCatch,
    addManual,
    reverse,
    importBackup,
  };
}
export type ArenaStore = ReturnType<typeof useArena>;
