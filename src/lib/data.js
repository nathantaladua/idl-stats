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

// Each team's own colour, taken from its page on idl.pro (jersey / brand
// colour), nudged only as far as needed to clear 3:1 contrast on the dark
// surface. Identity is also carried by the legend, direct line labels, the
// logo and the data tables, so these are safe to use as-is.
export const TEAM_COLOR = {
  "1-million": "#7E8DB4", // slate  (idl: rgb(87,100,129))
  brotherhood: "#D51C24", // red    (idl: rgb(170,12,23))
  grv: "#5ACE88", // green  (idl: rgb(90,206,136))
  "jam-republic": "#FF8229", // orange (idl: rgb(255,130,41))
  "quick-style": "#0F86DB", // blue   (idl: rgb(1,114,207))
  "royal-family": "#FFD321", // gold   (idl: rgb(255,211,33))
};

// IDL house accent (the acid lime used across idl.pro).
export const IDL_ACCENT = "#C0E700";

export const TEAM_LOGO = Object.fromEntries(
  Object.keys(TEAM_COLOR).map((id) => [id, `assets/logos/${id}.webp`])
);

const TEAM_BY_ID = Object.fromEntries(raw.teams.map((t) => [t.id, t]));

export const teams = raw.teams.slice().sort((a, b) => a.name.localeCompare(b.name));

export const events = raw.events.slice().sort((a, b) => a.series - b.series);

export function team(id) {
  return TEAM_BY_ID[id] || { id, name: id, roster: [] };
}
export function teamName(id) {
  return team(id).name;
}
export function color(id) {
  return TEAM_COLOR[id] || IDL_ACCENT;
}
export function logo(id) {
  return TEAM_LOGO[id] || null;
}

export const nf = (n, d = 1) =>
  n == null || Number.isNaN(n) ? "–" : Number(n).toFixed(d);
export const int = (n) => (n == null || Number.isNaN(n) ? "–" : Math.round(n).toString());
export const pct = (n, d = 0) => (n == null ? "–" : `${(n * 100).toFixed(d)}%`);
