# IDL Stats

An unofficial statistics site for the **International Dance League** 2026 season.
Standings, win-rate and score trends, full judge scorecards, and side-by-side
team comparison — all built from the public data on [idl.pro](https://www.idl.pro).

Not affiliated with the International Dance League. Team names, logos and
colours belong to their respective teams and to the IDL.

## What's in it

| View | Contents |
|------|----------|
| **Overview** | Season standings with per-series points and form, cumulative points race, judge-panel tendencies |
| **Trends** | Any metric (series points, avg judge score, match/judge win rate, fan-vote share, point margin) plotted series by series, with a season-to-date ranking and a per-criterion score table |
| **Compare** | **Two or three teams** — pairwise head-to-head records, every shared metric side by side, an overlaid 10-criteria radar, a final-round record block, and a series-by-series line |
| **Teams** | Per-team profile: record, average scores, podiums, final-round record, criteria radar, every match, and roster composition by nationality |
| **Matches** | Round 1's three matches with judge-by-judge points, fan vote, per-criterion averages and an expandable full 6-judge scorecard — then the Round 2 final |

Every line/bar/radar chart has a toolbar to **zoom and pan the Y axis** (the
lines and shapes grow and shrink as the value window tightens); once zoomed you
can also **drag the chart** to slide the value window. A **Lines** toggle hides
the connecting lines; the square points always stay visible.

### Team marks

Teams are labelled with a colour chip by default. Drop a compact square logo at
`public/assets/marks/<id>.png` (ids: `brotherhood`, `grv`, `1-million`,
`royal-family`, `jam-republic`, `quick-style`) and it replaces the chip
everywhere. idl.pro's press kit ships only the IDL brand marks, so per-team
marks have to be supplied by hand.

### Terminology

- **Series** — one stage of the season, held in a city (Series 1–6).
- **Match** — a head-to-head between two teams. Three per series; the three
  winners meet again in the **final round**, which sets the podium.
- **Match points** — the 0–7 tally within a match (six judges + one fan vote).
- **Series points** — what a team carries into the standings: its match-point
  tally, plus a 7 / 5 / 3 placement bonus for the three match winners.
- **Score** — a performance score out of 100 (decimal).

## Data

`src/data/idl.json` is a committed snapshot scraped from idl.pro. It carries the
season standings, all 12 Round 1 matches with full scorecards (6 judges × 10
criteria × 2 teams) and fan-vote splits, the Round 2 final result for each series
(three scores only — idl.pro publishes no per-judge breakdown for the final), and
team rosters.

### Refreshing the data

The scraper drives your local Google Chrome (via `puppeteer-core`, no Chromium
download) because the site renders scorecards into tab panels only on click.

```bash
npm run scrape          # rewrites src/data/idl.json
npm run scrape -- --headful   # watch it work
npm run assets          # re-downloads team logos + IDL mark into public/assets/
```

Set `CHROME_PATH` if Chrome is somewhere non-standard. Re-run after each new
series (Los Angeles and the Championship close out the 6-series season).

## Colours

Each team uses its own brand / jersey colour taken from its idl.pro page, nudged
only far enough to clear 3:1 contrast on the dark surface. Because these are
brand colours rather than a colour-vision-tuned ramp, every chart also carries a
legend, direct line labels and a data table so identity never rests on hue alone.
The site accent is the IDL house lime.

## Develop

```bash
npm install
npm run dev
npm run build           # -> dist/
```

## Deploy

`base` is `./` so the build runs at any path. `.github/workflows/deploy.yml`
publishes `dist/` to GitHub Pages on every push to `main` — enable Pages
(Settings → Pages → Source: GitHub Actions) once. Routing is hash-based, so deep
links work on Pages with no extra config.

## Stack

Vite · React · Recharts · Inter (the site's own typeface).
