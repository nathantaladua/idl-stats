import raw from "../data/idl.json";

export const data = raw;

export const CRITERIA = raw.criteria;
export const CRITERIA_SHORT = [
  "Complexity",
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

// Each judged criterion, /10. Descriptions condensed from the IDL scoring
// rubric. `slug` is used for deep links into the Criteria view.
export const CRITERIA_INFO = [
  {
    name: "Complexity of Choreography",
    short: "Complexity",
    slug: "complexity",
    desc: "Level of difficulty implemented through movement — weight changes, varied intricate movement, isolations, tempo changes and the like.",
  },
  {
    name: "Staging",
    short: "Staging",
    slug: "staging",
    desc: "Varied formations and creative ways of moving between them for quick, seamless transitions, plus adequate use of the performance floor.",
  },
  {
    name: "Musicality",
    short: "Musicality",
    slug: "musicality",
    desc: "Choreography that interprets and responds to instrumentation, rhythmic variations, vocals and lyrics, highlighting the depth of the track.",
  },
  {
    name: "Creativity",
    short: "Creativity",
    slug: "creativity",
    desc: "Original movements, concepts and transitions that make the routine unique, refreshing and distinguished from others.",
  },
  {
    name: "Stylistic Athleticism",
    short: "Athleticism",
    slug: "athleticism",
    desc: "Choreography that demonstrates high-level athleticism — strength, power, control and technical skill — within the styles being used.",
  },
  {
    name: "Cleanliness",
    short: "Cleanliness",
    slug: "cleanliness",
    desc: "Consistent unison and timing across the team; uniformity of movement within the choreography and the skills.",
  },
  {
    name: "Technical Execution + Authenticity",
    short: "Technique",
    slug: "technique",
    desc: "Proper usage and execution of movements that are authentic to the styles from which they originate.",
  },
  {
    name: "Spacing",
    short: "Spacing",
    slug: "spacing",
    desc: "Consistent, even positioning of dancers through all formations and transitions, giving clarity to the intended staging and pictures.",
  },
  {
    name: "Projection / Communication",
    short: "Projection",
    slug: "projection",
    desc: "Conveying a unified message and connecting with the audience — expression, emotion, intra-team interaction, energy and entertainment value.",
  },
  {
    name: "Stamina",
    short: "Stamina",
    slug: "stamina",
    desc: "Consistent energy management and execution across the whole routine — the same power, control and commitment from beginning to end.",
  },
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

// Tight abbreviations for dense table headers.
export const TEAM_ABBR = {
  brotherhood: "BRHD",
  "1-million": "1MIL",
  grv: "GRV",
  "jam-republic": "JAM",
  "quick-style": "QS",
  "royal-family": "RF",
};
export const abbr = (id) => TEAM_ABBR[id] || (team(id).name || id).split(" ")[0];

// Wide team logo lockups scraped from each team's page.
export const TEAM_LOGO = Object.fromEntries(
  Object.keys(TEAM_COLOR).map((id) => [id, `assets/logos/${id}.webp`])
);

// Compact square team marks. Drop a file at public/assets/marks/<id>.(svg|png|webp)
// and it replaces the colour chip everywhere; until then the chip falls back to
// the plain colour swatch.
export const TEAM_MARK = Object.fromEntries(
  Object.keys(TEAM_COLOR).map((id) => [id, `assets/marks/${id}.png`])
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
export function mark(id) {
  return TEAM_MARK[id] || null;
}

export const nf = (n, d = 1) =>
  n == null || Number.isNaN(n) ? "–" : Number(n).toFixed(d);
export const int = (n) => (n == null || Number.isNaN(n) ? "–" : Math.round(n).toString());
export const pct = (n, d = 0) => (n == null ? "–" : `${(n * 100).toFixed(d)}%`);
