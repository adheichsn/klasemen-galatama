export type RuleCategory = "Tarikan" | "Bonus" | "Penalti";
export type ScoringRule = {
  id: string;
  name: string;
  points: number;
  category: RuleCategory;
  enabled: boolean;
};
export type Player = {
  id: string;
  username: string;
  displayName: string;
  checkedIn: boolean;
};
export type Team = {
  id: string;
  name: string;
  color: string;
  players: Player[];
};
export type CatchItem = {
  ruleId: string;
  name: string;
  pointsEach: number;
  quantity: number;
};
export type ScoreEntry = {
  id: string;
  teamId: string;
  playerId: string;
  kind: "catch" | "manual" | "reversal";
  delta: number;
  description: string;
  details?: CatchItem[];
  createdAt: string;
  reversesEntryId?: string;
};
export type TimerData = {
  durationSec: number;
  remainingSec: number;
  runningSince: number | null;
};
export type Tournament = {
  version: 1;
  title: string;
  usn: string;
  map: string;
  rules: ScoringRule[];
  teams: Team[];
  entries: ScoreEntry[];
  timer: TimerData;
};
export type Selection = { teamId: string; playerId: string };
export type ModalName =
  | "settings"
  | "rules"
  | "teams"
  | "history"
  | "help"
  | null;
