export type EventMode = "solo" | "squad";
export type EventStatus = "draft" | "live" | "finished";
export type TieBreaker = "catches" | "bonus" | "alphabetical";
export type FishRule = {
  id: string;
  name: string;
  points: number;
  enabled: boolean;
};
export type BonusRule = {
  id: string;
  name: string;
  points: number;
  enabled: boolean;
};
export type WrittenRule = { id: string; group: string; content: string };
export type FaqItem = { id: string; question: string; answer: string };
export type Squad = {
  id: string;
  name: string;
  color: string;
  captainId?: string | null;
};
export type Participant = {
  id: string;
  name: string;
  username: string;
  checkedIn: boolean;
  squadId: string | null;
};
export type EntryBonus = { id: string; name: string; points: number };
export type ScoreEntry = {
  id: string;
  participantId: string;
  // Team snapshot for new Squad transactions. Legacy events may omit this field.
  squadId?: string | null;
  kind: "catch" | "manual" | "reversal";
  delta: number;
  description: string;
  createdAt: string;
  fishId?: string;
  fishName?: string;
  basePoints?: number;
  quantity?: number;
  bonuses?: EntryBonus[];
  reversesEntryId?: string;
  /** Optional, unique evidence/receipt reference within this tournament. */
  catchRef?: string;
};
export type MatchTimer = {
  durationSec: number;
  remainingSec: number;
  runningSince: number | null;
};
export type ArenaEvent = {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  host: string;
  eventDate: string;
  mode: EventMode;
  status: EventStatus;
  published: boolean;
  /** Optional marketing fields for existing database snapshots/backups. */
  bannerUrl?: string;
  featured?: boolean;
  tieBreaker: TieBreaker;
  tieBonusId: string | null;
  fish: FishRule[];
  bonuses: BonusRule[];
  writtenRules: WrittenRule[];
  faqs: FaqItem[];
  squads: Squad[];
  /** Locked manually during Draft; LIVE/FINISHED implicitly locked. */
  rosterLocked?: boolean;
  /** Maximum members per squad; 0 means unlimited. */
  squadSizeLimit?: number;
  participants: Participant[];
  entries: ScoreEntry[];
  timer: MatchTimer;
  createdAt: string;
  /** First start timestamp (kept when pausing/resuming). */
  startedAt?: string;
  finishedAt?: string;
};
export type ArenaData = {
  version: 2;
  activeEventId: string;
  events: ArenaEvent[];
};
export type EditorSection =
  | "general"
  | "marketing"
  | "fish"
  | "bonuses"
  | "rules"
  | "participants"
  | "faq";
