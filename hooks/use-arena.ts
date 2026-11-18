"use client";
import { useEffect, useRef, useState } from "react";
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
import type { EventLifecycleAction } from "@/lib/event-lifecycle";
import { validBannerUrl } from "@/lib/banner";
import {
  ARENA_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  validArena,
  migrateLegacy,
} from "@/lib/arena-storage";
import { isReversed, secondsLeft, validPoints } from "@/lib/arena-utils";
import {
  addRosterMember,
  addRosterSquad,
  planCsvImport,
  rosterEditable,
  squadLimit,
  playerKey,
  squadKey,
} from "@/lib/roster-management";
import {
  startMatch,
  pauseMatch,
  resumeMatch,
  finishMatch,
  resetDraftClock,
} from "@/lib/match-operations";
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
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventBusy, setEventBusy] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [saveError, setSaveError] = useState("");
  const hydrated = useRef(false);
  const skipDirtyEffect = useRef(false);
  const dataRef = useRef(data);
  const persistedEntryIds = useRef(new Set<string>());
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    let cancelled = false;
    async function loadServer() {
      try {
        const response = await fetch("/api/admin/state", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Sesi panitia habis. Login ulang."
              : "Tidak bisa terhubung ke database. Pastikan DATABASE_URL dan db/schema.sql sudah disiapkan.",
          );
        const snapshot: { data: unknown; revision: number } =
          await response.json();
        if (
          !validArena(snapshot.data) ||
          !snapshot.data.events.length ||
          !Number.isSafeInteger(snapshot.revision)
        )
          throw new Error("Data dari server tidak valid.");
        if (cancelled) return;
        setData(snapshot.data);
        persistedEntryIds.current = new Set(
          snapshot.data.events.flatMap((ev) =>
            ev.entries.map((entry) => entry.id),
          ),
        );
        setRevision(snapshot.revision);
        setNow(Date.now());
        setReady(true);
      } catch (error) {
        if (!cancelled)
          setConnectionError(
            error instanceof Error
              ? error.message
              : "Gagal memuat data server.",
          );
      }
    }
    void loadServer();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (skipDirtyEffect.current) {
      skipDirtyEffect.current = false;
      return;
    }
    setDirty(true);
  }, [ready, data]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = async () => {
    if (!ready || saving || eventBusy || !dirty) return false;
    const snapshot = dataRef.current;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/admin/state", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, data: snapshot }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Gagal menyimpan data.");
      setRevision(result.revision);
      if (dataRef.current === snapshot && validArena(result.data)) {
        // Use canonical server timestamps (not the browser clock) after Save.
        skipDirtyEffect.current = true;
        dataRef.current = result.data;
        persistedEntryIds.current = new Set(
          result.data.events.flatMap((ev: ArenaEvent) =>
            ev.entries.map((entry: ScoreEntry) => entry.id),
          ),
        );
        setData(result.data);
        setDirty(false);
      }
      return true;
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Gagal menyimpan data.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };
  const restoreBrowserBackup = () => {
    if (typeof window === "undefined") return false;
    try {
      const current = localStorage.getItem(ARENA_STORAGE_KEY);
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      const raw = current || legacy;
      if (!raw) return false;
      const parsed: unknown = JSON.parse(raw);
      const converted = validArena(parsed) ? parsed : migrateLegacy(parsed);
      if (!converted || !converted.events.length) return false;
      setData(converted);
      setMigrated(true);
      return true;
    } catch {
      return false;
    }
  };
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
  const createHistorical = (mode: EventMode = "solo") => {
    const event = newEvent("Arsip Galatama Historis", mode);
    event.historical = true;
    setData((prev) => ({
      ...prev,
      activeEventId: event.id,
      events: [event, ...prev.events],
    }));
    return event.id;
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
      startedAt: undefined,
      finishedAt: undefined,
      historical: undefined,
      historicalRecordedAt: undefined,
      historicalPodium: undefined,
      published: false,
      featured: false,
      createdAt: new Date().toISOString(),
      entries: [],
      participants: [],
      fish: source.fish.map((f) => ({ ...f, id: newId() })),
      bonuses: copiedBonuses,
      tieBonusId: tieBonusIndex >= 0 ? copiedBonuses[tieBonusIndex].id : null,
      writtenRules: source.writtenRules.map((r) => ({ ...r, id: newId() })),
      faqs: source.faqs.map((q) => ({ ...q, id: newId() })),
      squads: source.squads.map((s) => ({
        ...s,
        id: newId(),
        captainId: null,
      })),
      rosterLocked: false,
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
  // Trash, restore, and permanent deletion MUST commit through the dedicated
  // server endpoint. Never emulate deletion with local snapshot editing.
  const eventLifecycle = async (
    id: string,
    action: EventLifecycleAction,
    confirmTitle?: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!ready || saving || eventBusy || dirty)
      return {
        ok: false,
        error: dirty
          ? "Simpan perubahan ke Server terlebih dahulu sebelum mengelola Trash."
          : "Operasi belum siap. Coba lagi setelah penyimpanan selesai.",
      };
    setEventBusy(true);
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, revision, confirmTitle }),
      });
      const result: {
        error?: string;
        revision?: number;
        data?: unknown;
      } = await response.json();
      if (
        !response.ok ||
        !validArena(result.data) ||
        !Number.isSafeInteger(result.revision)
      )
        return { ok: false, error: result.error || "Gagal memperbarui Trash." };
      skipDirtyEffect.current = true;
      setData(result.data);
      dataRef.current = result.data;
      setRevision(result.revision as number);
      persistedEntryIds.current = new Set(
        result.data.events.flatMap((ev: ArenaEvent) =>
          ev.entries.map((entry: ScoreEntry) => entry.id),
        ),
      );
      setDirty(false);
      setSaveError("");
      return { ok: true };
    } catch {
      return { ok: false, error: "Tidak bisa terhubung ke server. Coba lagi." };
    } finally {
      setEventBusy(false);
    }
  };
  const finalizeHistorical = async (confirmTitle: string, podium: string[]) => {
    if (!ready || saving || eventBusy || dirty || !active?.historical || active.status !== "draft")
      return { ok: false, error: dirty ? "Klik Simpan ke Server terlebih dahulu." : "Draft historis belum siap." };
    setEventBusy(true);
    try {
      const response = await fetch("/api/admin/historical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ eventId: active.id, revision, confirmTitle, podium }),
      });
      const result: { error?: string; data?: unknown; revision?: number } = await response.json();
      if (!response.ok || !validArena(result.data) || !Number.isSafeInteger(result.revision))
        return { ok: false, error: result.error || "Gagal mengunci hasil historis." };
      skipDirtyEffect.current = true;
      dataRef.current = result.data;
      setData(result.data);
      setRevision(result.revision as number);
      persistedEntryIds.current = new Set(result.data.events.flatMap((ev: ArenaEvent) => ev.entries.map((entry: ScoreEntry) => entry.id)));
      setDirty(false);
      setSaveError("");
      return { ok: true };
    } catch {
      return { ok: false, error: "Server tidak bisa dihubungi. Data historis belum difinalisasi." };
    } finally {
      setEventBusy(false);
    }
  };
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
  const banner = (value: string) => {
    if (!validBannerUrl(value)) return;
    update((e) => ({ ...e, bannerUrl: value }), true);
  };
  const feature = (value: boolean) =>
    update((e) => e.historical && e.status === "draft" ? e : ({ ...e, featured: value }), true);
  const publish = (value: boolean) =>
    update((e) => e.historical && e.status === "draft" ? e : ({ ...e, published: value }), true);
  const status = (value: EventStatus) =>
    update((e) => {
      if (value === "live") return startMatch(e);
      if (value === "finished") return finishMatch(e);
      // Finished tournaments are final. No status rollback here.
      return e;
    });
  const setDuration = (mins: number) =>
    update((e) => {
      const sec = Math.round(mins * 60);
      return e.status === "draft" &&
        Number.isSafeInteger(sec) &&
        sec >= 60 &&
        sec <= 86400
        ? {
          ...e,
          timer: { durationSec: sec, remainingSec: sec, runningSince: null },
        }
        : e;
    });
  const toggleTimer = () =>
    update((e) =>
      e.timer.runningSince === null ? resumeMatch(e) : pauseMatch(e),
    );
  const resetTimer = () => update(resetDraftClock);
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
  const addSquad = (name: string) =>
    update((e) => addRosterSquad(e, name) || e);
  const changeSquad = (id: string, fields: Partial<Squad>) =>
    update((e) => {
      if (!rosterEditable(e)) return e;
      const item = e.squads.find((s) => s.id === id);
      if (!item) return e;
      if (
        fields.name !== undefined &&
        (!fields.name.trim() ||
          e.squads.some(
            (s) =>
              s.id !== id && squadKey(s.name) === squadKey(fields.name || ""),
          ))
      )
        return e;
      if (
        fields.captainId &&
        !e.participants.some(
          (p) => p.id === fields.captainId && p.squadId === id,
        )
      )
        return e;
      return {
        ...e,
        squads: e.squads.map((s) =>
          s.id === id
            ? { ...s, ...fields, name: (fields.name ?? s.name).slice(0, 70) }
            : s,
        ),
      };
    });
  const removeSquad = (id: string) =>
    update((e) =>
      !rosterEditable(e) || e.participants.some((p) => p.squadId === id)
        ? e
        : { ...e, squads: e.squads.filter((s) => s.id !== id) },
    );
  const setRosterLocked = (locked: boolean) =>
    update((e) =>
      e.status === "draft" && e.entries.length === 0
        ? { ...e, rosterLocked: locked }
        : e,
    );
  const setSquadSizeLimit = (limit: number) =>
    update((e) => {
      if (
        !rosterEditable(e) ||
        e.mode !== "squad" ||
        !Number.isSafeInteger(limit) ||
        limit < 0 ||
        limit > 100
      )
        return e;
      if (
        limit > 0 &&
        e.squads.some(
          (s) =>
            e.participants.filter((p) => p.squadId === s.id).length > limit,
        )
      )
        return e;
      return { ...e, squadSizeLimit: limit };
    });
  const addParticipant = (
    name: string,
    username: string,
    squadId: string | null,
  ) => update((e) => addRosterMember(e, name, username, squadId) || e);
  const importRosterCsv = (text: string) => {
    const e = dataRef.current.events.find(
      (event) => event.id === dataRef.current.activeEventId,
    );
    if (!e) return false;
    const plan = planCsvImport(e, text);
    if (!plan.prepared) return false;
    update((current) =>
      current.id === e.id && rosterEditable(current)
        ? planCsvImport(current, text).prepared || current
        : current,
    );
    return true;
  };
  const changeParticipant = (id: string, fields: Partial<Participant>) =>
    update((e) => {
      const existing = e.participants.find((p) => p.id === id);
      if (!existing) return e;
      if (
        !rosterEditable(e) &&
        Object.keys(fields).some((key) => key !== "checkedIn")
      )
        return e;
      if (fields.username !== undefined) {
        const clean = fields.username.trim().replace(/^@/, "");
        if (
          clean.length > 20 ||
          (clean && !/^[a-zA-Z0-9_]{1,20}$/.test(clean)) ||
          (clean &&
            e.participants.some(
              (p) => p.id !== id && playerKey(p.username) === playerKey(clean),
            ))
        )
          return e;
        fields = { ...fields, username: clean };
      }
      if (fields.squadId !== undefined && fields.squadId !== existing.squadId) {
        if (!canAssignSquad(e, id, fields.squadId)) return e;
        if (
          fields.squadId &&
          squadLimit(e) > 0 &&
          e.participants.filter((p) => p.squadId === fields.squadId).length >=
          squadLimit(e)
        )
          return e;
      }
      const nextSquads =
        fields.squadId !== undefined && fields.squadId !== existing.squadId
          ? e.squads.map((s) =>
            s.captainId === id ? { ...s, captainId: null } : s,
          )
          : e.squads;
      return {
        ...e,
        squads: nextSquads,
        participants: e.participants.map((p) =>
          p.id === id
            ? {
              ...p,
              ...fields,
              name:
                fields.name !== undefined ? fields.name.slice(0, 80) : p.name,
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
      !rosterEditable(e) || e.entries.some((s) => s.participantId === id)
        ? e
        : {
          ...e,
          squads: e.squads.map((s) =>
            s.captainId === id ? { ...s, captainId: null } : s,
          ),
          participants: e.participants.filter((p) => p.id !== id),
        },
    );
  const addCatch = (
    participantId: string,
    fishId: string,
    bonusIds: string[],
    quantity: number,
    catchRef = "",
  ) => {
    const e = active;
    if (
      !e ||
      !e.participants.some((p) => p.id === participantId) ||
      !(e.status === "live" || (e.historical && e.status === "draft")) ||
      (!e.historical && (e.timer.runningSince === null ||
        secondsLeft(e.timer, Date.now()) <= 0)) ||
      (e.mode === "squad" &&
        !e.participants.find((p) => p.id === participantId)?.squadId)
    )
      return false;
    const reference = catchRef.trim();
    if (
      reference &&
      (reference.length < 2 ||
        reference.length > 80 ||
        e.entries.some(
          (item) =>
            item.catchRef?.toLocaleUpperCase("id-ID") ===
            reference.toLocaleUpperCase("id-ID"),
        ))
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
      ...(reference ? { catchRef: reference } : {}),
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
      !(active.status === "live" || (active.historical && active.status === "draft")) ||
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
        original &&
        !persistedEntryIds.current.has(id) &&
        original.kind !== "reversal"
      ) {
        // A pending local-only input can be discarded; a saved score needs a reversal.
        return { ...e, entries: e.entries.filter((item) => item.id !== id) };
      }
      if (
        !original ||
        original.kind === "reversal" ||
        isReversed(e.entries, id) ||
        !(e.status === "live" || (e.historical && e.status === "draft"))
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
  const setHistoricalOfficialPoints = (participantId: string, total: number) => {
    const event = dataRef.current.events.find((item) => item.id === dataRef.current.activeEventId);
    if (!event || !event.historical || event.status !== "draft" || !Number.isSafeInteger(total) || Math.abs(total) > 1_000_000)
      return false;
    const participant = event.participants.find((p) => p.id === participantId);
    if (!participant || (event.mode === "squad" && !participant.squadId)) return false;
    const current = event.entries.reduce((sum, entry) => sum + (entry.participantId === participantId ? entry.delta : 0), 0);
    const adjustment = total - current;
    if (adjustment === 0) return true;
    if (!validPoints(adjustment)) return false;
    return addManual(participantId, adjustment, "Rekonsiliasi total poin resmi • arsip historis");
  };
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
    revision,
    dirty,
    saving,
    eventBusy,
    connectionError,
    saveError,
    save,
    restoreBrowserBackup,
    remaining,
    setActive,
    create,
    createHistorical,
    finalizeHistorical,
    duplicate,
    eventLifecycle,
    field,
    mode,
    setTie,
    publish,
    banner,
    feature,
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
    setRosterLocked,
    setSquadSizeLimit,
    addParticipant,
    importRosterCsv,
    changeParticipant,
    removeParticipant,
    addCatch,
    addManual,
    setHistoricalOfficialPoints,
    reverse,
    importBackup,
  };
}
export type ArenaStore = ReturnType<typeof useArena>;
