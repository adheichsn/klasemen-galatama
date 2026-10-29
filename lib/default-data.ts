import type { Tournament, ScoringRule, Team } from "./types";

const fish: Array<[string, number, ScoringRule["category"]]> = [
  ["Secret", 1, "Tarikan"],
  ["Big", 1, "Bonus"],
  ["Shiny", 1, "Bonus"],
  ["Mutasi", 1, "Bonus"],
  ["Pelagon", 2, "Tarikan"],
  ["Mutant Cosmic", 2, "Tarikan"],
  ["Megalodon", 3, "Tarikan"],
  ["Glacial", 3, "Tarikan"],
  ["FB 100+", 3, "Tarikan"],
  ["FB Maxton", 5, "Tarikan"],
  ["Forgotten", 5, "Tarikan"],
];
const colors = [
  "#f5bb35",
  "#a7b4c1",
  "#e78438",
  "#5a92ff",
  "#de5aa3",
  "#8a7df5",
];
export function makeTeam(index: number): Team {
  return {
    id: `team-${index}`,
    name: `CLAN ${index}`,
    color: colors[(index - 1) % colors.length],
    players: Array.from({ length: 3 }, (_, j) => ({
      id: `player-${index}-${j + 1}`,
      username: "",
      displayName: "",
      checkedIn: false,
    })),
  };
}
export function initialTournament(): Tournament {
  return {
    version: 1,
    title: "GALATAMA SCOREBOARD",
    usn: "",
    map: "",
    rules: fish.map(([name, points, category], i) => ({
      id: `rule-${i + 1}`,
      name,
      points,
      category,
      enabled: true,
    })),
    teams: Array.from({ length: 6 }, (_, i) => makeTeam(i + 1)),
    entries: [],
    timer: { durationSec: 90 * 60, remainingSec: 90 * 60, runningSince: null },
  };
}
