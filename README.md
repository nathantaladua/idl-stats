# IDL Stats

An unofficial statistics site for the **International Dance League** 2026 season.
Standings, win-rate and score trends, full judge scorecards, and side-by-side
team comparison — all built from the public data on [idl.pro](https://www.idl.pro).

Not affiliated with the International Dance League.

## What's in it

| View | Contents |
|------|----------|
| **Overview** | Season standings with per-stage points and form, cumulative points race, judge-panel tendencies |
| **Trends** | Any metric (points, avg judge score, match/judge win rate, fan-vote share, point margin) plotted stage by stage, with a season-to-date ranking and a per-criterion score table |
| **Compare** | Two teams head to head — record, every shared metric as a diverging bar, an overlaid 10-criteria radar, and a stage-by-stage line |
| **Teams** | Per-team profile: record, average scores, podiums, criteria radar, every battle, and roster composition by nationality |
| **Matches** | Every battle with judge-by-judge points, fan vote, per-criterion averages, and an expandable full 6-judge scorecard |

## Data

`src/data/idl.json` is a committed snapshot scraped from idl.pro. It carries the
season standings, each stage's podium, and all 12 battles with full scorecards
(6 judges × 10 criteria × 2 teams), fan-vote splits, and rosters.

### Refreshing the data

The scraper drives your local Google Chrome (via `puppeteer-core`, no Chromium
download) because the site renders scorecards into tab panels only on click.

```bash
npm run scrape          # rewrites src/data/idl.json
npm run scrape -- --headful   # watch it work
```

Set `CHROME_PATH` if Chrome is somewhere non-standard. Re-run after each new
stage (Los Angeles and the Championship close out the 6-stage season).

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

Vite · React · Recharts. Team colours use a categorical palette validated for
contrast and colour-vision deficiency against the dark surface.
