import raw from "../data/idl.json";

export const data = raw;

export const CRITERIA = raw.criteria;
export const CRITERIA_SHORT = [
  "Choreo",
  "Staging",
  "Musicality",
  "Creativity",
  "Athleticism",
  "Cleanliness",
  "Technique",
  "Spacing",
  "Projection",
  "Stamina",
];

// Fixed colour slot per team (never reassigned by rank / filter).
export const TEAM_COLOR = {
  "1-million": "#3987e5",
  brotherhood: "#d95926",
  grv: "#199e70",
  "jam-republic": "#c98500",
  "quick-style": "#d55181",
  "royal-family": "#008300",
};

const TEAM_BY_ID = Object.fromEntries(raw.teams.map((t) => [t.id, t]));

export const teams = raw.teams
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

export const events = raw.events
  .slice()
  .sort((a, b) => a.series - b.series);

export function team(id) {
  return TEAM_BY_ID[id] || { id, name: id, roster: [] };
}
export function teamName(id) {
  return team(id).name;
}
export function color(id) {
  return TEAM_COLOR[id] || "#3987e5";
}

export const nf = (n, d = 1) =>
  n == null || Number.isNaN(n) ? "–" : Number(n).toFixed(d);
export const pct = (n, d = 0) => (n == null ? "–" : `${(n * 100).toFixed(d)}%`);
