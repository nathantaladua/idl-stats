/**
 * IDL statistics scraper
 * -----------------------
 * Pulls the statistical data (season standings, event podiums, head-to-head
 * matches and full judge scorecards) from https://www.idl.pro and writes it to
 * src/data/idl.json.
 *
 * The site is a Framer build that renders match scorecards into hidden tab
 * panels only when a tab is activated, so we drive a real browser (the system
 * Google Chrome via puppeteer-core) rather than parsing static HTML.
 *
 * Usage:  npm run scrape
 *         npm run scrape -- --headful      (watch it work)
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/idl.json");
const BASE = "https://www.idl.pro";
const HEADFUL = process.argv.includes("--headful");

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  process.env.CHROME_PATH,
].filter(Boolean);

const EXECUTABLE = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!EXECUTABLE) {
  console.error("Could not find Chrome/Chromium. Set CHROME_PATH to its binary.");
  process.exit(1);
}

/* ------------------------------------------------------------------ helpers */

const slug = (name) =>
  String(name)
    .toLowerCase()
    .replace(/1million/g, "1-million")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const TEAM_ALIASES = {
  "1million": "1-million",
  "1 million": "1-million",
  brotherhood: "brotherhood",
  grv: "grv",
  "royal family": "royal-family",
  "jam republic": "jam-republic",
  "quick style": "quick-style",
};
const teamId = (name) => {
  const k = String(name).trim().toLowerCase();
  return TEAM_ALIASES[k] || slug(k);
};

const EVENTS = [
  { id: "new-york", path: "/results/new-york", series: 1 },
  { id: "vancouver", path: "/results/vancouver", series: 2 },
  { id: "sydney", path: "/results/sydney", series: 3 },
  { id: "seoul", path: "/results/seoul", series: 4 },
];

const TEAM_PAGES = [
  "brotherhood",
  "grv",
  "1-million",
  "royal-family",
  "jam-republic",
  "quick-style",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --------------------------------------------------- in-page extractors */

// Extract event meta, podium and the three match summaries from visible text.
function pageSummary() {
  const lines = document.body.innerText
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const MONTHS = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i;
  const date = lines.find((l) => /\b\d{4}\b/.test(l) && MONTHS.test(l) && l.length < 30);
  const cityIdx = lines.findIndex((l) => /^[A-Z][A-Z .]+$/.test(norm(l)) && norm(l).length < 30 && l !== "PRO DIVISION WINNER");

  // Podium: "PRO DIVISION WINNER" then 1ST/2ND/3RD triples
  const pIdx = lines.findIndex((l) => /^PRO\s+DIVISION\s+WINNER$/i.test(norm(l)));
  const podium = [];
  if (pIdx >= 0) {
    const seg = lines.slice(pIdx + 1, pIdx + 40);
    const rankRe = /^(1ST|2ND|3RD|4TH|5TH|6TH)$/i;
    for (let i = 0; i < seg.length - 2; i++) {
      if (rankRe.test(seg[i])) {
        const rank = { "1ST": 1, "2ND": 2, "3RD": 3, "4TH": 4, "5TH": 5, "6TH": 6 }[seg[i].toUpperCase()];
        const team = seg[i + 1];
        const score = parseFloat(seg[i + 2]);
        if (team && !Number.isNaN(score)) podium.push({ team, rank, score });
      }
    }
  }

  // Matches: "PRO DIVISION WINNER DETAILS" then repeated [Match N, teamA, ptA, teamB, ptB]
  const dIdx = lines.findIndex((l) => /PRO\s+DIVISION\s+WINNER\s+DETAILS/i.test(norm(l)));
  const matches = [];
  if (dIdx >= 0) {
    const seg = lines.slice(dIdx + 1, dIdx + 60);
    for (let i = 0; i < seg.length; i++) {
      const m = /^Match\s+([1-9])$/i.exec(seg[i]);
      if (m && seg[i + 4] !== undefined) {
        const teamA = seg[i + 1];
        const ptA = parseInt(seg[i + 2], 10);
        const teamB = seg[i + 3];
        const ptB = parseInt(seg[i + 4], 10);
        if (teamA && teamB && Number.isFinite(ptA) && Number.isFinite(ptB)) {
          matches.push({ n: parseInt(m[1], 10), teamA, ptA, teamB, ptB });
        }
      }
    }
  }

  return {
    date,
    city: cityIdx >= 0 ? norm(lines[cityIdx]) : null,
    venue: cityIdx >= 0 ? lines[cityIdx + 1] : null,
    podium,
    matches,
  };
}

// Extract the full scorecard for whichever match tab is currently active.
function activeScorecard() {
  const vis = (el) => el && el.offsetParent !== null && el.getClientRects().length;
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const num = (s) => {
    const m = String(s).replace(/[, ]/g, "").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };

  // ---- criterion averages (Scoresheet Wrap) ----
  let averages = null;
  const sw = [...document.querySelectorAll('[data-framer-name="Scoresheet Wrap"]')].find(vis);
  if (sw) {
    const pw = [...sw.querySelectorAll('[data-framer-name="Point Wrap"]')].find((x) =>
      x.querySelector('[data-framer-name="Cell A"]')
    );
    if (pw) {
      const col = (cn) => {
        const c = pw.querySelector('[data-framer-name="' + cn + '"]');
        return c ? [...c.children].map((e) => num(txt(e))) : null;
      };
      averages = {
        a: col("Cell A"),
        b: col("Cell B"),
        totalA: num(txt(sw.querySelector('[data-framer-name="Total Score Cell A"]'))),
        totalB: num(txt(sw.querySelector('[data-framer-name="Total Score Cell B"]'))),
      };
    }
  }

  // ---- per-judge criterion scores ----
  const seen = {};
  const judges = [];
  [...document.querySelectorAll('[data-framer-name="Match Table"]')]
    .filter(vis)
    .forEach((mt) => {
      const label = txt(mt.querySelector('[data-framer-name="Judge Name"]'));
      const name = txt(mt.querySelector('[data-framer-name="Judge Title"]'));
      if (!label || seen[label]) return;
      const pw = mt.querySelector('[data-framer-name="Point Wrap"]');
      const colA = pw && pw.querySelector('[data-framer-name="Cell A"]');
      const colB = pw && pw.querySelector('[data-framer-name="Cell B"]');
      if (!colA || !colB) return;
      const a = [...colA.children].map((e) => num(txt(e)));
      const b = [...colB.children].map((e) => num(txt(e)));
      if (a.length !== 10 || b.length !== 10 || a.some((x) => x == null)) return;
      seen[label] = true;
      judges.push({
        judge: label,
        name,
        a,
        b,
        totalA: num(txt(mt.querySelector('[data-framer-name="Total Score Cell A"]'))),
        totalB: num(txt(mt.querySelector('[data-framer-name="Total Score Cell B"]'))),
        pointA: num(txt(mt.querySelector('[data-framer-name="Cell A Point"]'))) || 0,
        pointB: num(txt(mt.querySelector('[data-framer-name="Cell B Point"]'))) || 0,
      });
    });

  // ---- fan / community vote ----
  const fanA = [...document.querySelectorAll('[data-framer-name="Fans Cell A"]')].filter(vis).map(txt)[0];
  const fanB = [...document.querySelectorAll('[data-framer-name="Fans Cell B"]')].filter(vis).map(txt)[0];

  // Two "Vote Info" banner blocks, in team A / team B order:
  //   "FAN VOTE:19%(1,733 VOTES)"
  const voteInfo = [...document.querySelectorAll('[data-framer-name="Vote Info"]')]
    .filter(vis)
    .map((e) => {
      const s = txt(e);
      const pctM = s.match(/(\d+)\s*%/);
      const voteM = s.match(/([\d,]+)\s*VOTES?/i);
      return { pct: pctM ? +pctM[1] : null, votes: voteM ? +voteM[1].replace(/,/g, "") : null };
    });

  return {
    averages,
    judges,
    fan: {
      pointA: num(fanA) || 0,
      pointB: num(fanB) || 0,
      pctA: voteInfo[0] ? voteInfo[0].pct : null,
      pctB: voteInfo[1] ? voteInfo[1].pct : null,
      votesA: voteInfo[0] ? voteInfo[0].votes : null,
      votesB: voteInfo[1] ? voteInfo[1].votes : null,
    },
  };
}

// Final round ("Final Match" tab): a three-team scoresheet — Cell A / B / C
// map to the podium's 1st / 2nd / 3rd. Each judge scores all three teams;
// there is no head-to-head point, the placement comes from the totals plus a
// fan-vote bonus.
function activeFinalScorecard() {
  const vis = (el) => el && el.offsetParent !== null && el.getClientRects().length;
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const num = (s) => {
    const m = String(s).replace(/[, ]/g, "").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };
  const CELLS = ["Cell A", "Cell B", "Cell C"];

  const teamNames = [...document.querySelectorAll('[data-framer-name="Team Name"]')]
    .filter(vis)
    .map(txt)
    .slice(0, 3);
  if (teamNames.length !== 3) return null;

  // criterion averages per team
  let averages = null;
  const sw = [...document.querySelectorAll('[data-framer-name="Scoresheet Wrap"]')].find(vis);
  if (sw) {
    const pw = [...sw.querySelectorAll('[data-framer-name="Point Wrap"]')].find((x) =>
      x.querySelector('[data-framer-name="Cell A"]')
    );
    if (pw) {
      const col = (cn) => {
        const c = pw.querySelector('[data-framer-name="' + cn + '"]');
        return c ? [...c.children].map((e) => num(txt(e))) : null;
      };
      averages = {
        byTeam: CELLS.map(col),
        totals: CELLS.map((cn) =>
          num(txt(sw.querySelector('[data-framer-name="Total Score ' + cn + '"]')))
        ),
      };
    }
  }

  // per-judge criterion scores (the "Cell X Point" node holds the /100 total)
  const seen = {};
  const judges = [];
  [...document.querySelectorAll('[data-framer-name="Judge Name"]')].filter(vis).forEach((el) => {
    const label = txt(el);
    if (!label || seen[label]) return;
    let c = el;
    for (let i = 0; i < 8 && c; i++) {
      if (c.querySelector && c.querySelector('[data-framer-name="Point Wrap"]')) break;
      c = c.parentElement;
    }
    if (!c) return;
    const pw = c.querySelector('[data-framer-name="Point Wrap"]');
    if (!pw) return;
    const cols = CELLS.map((cn) => {
      const x = pw.querySelector('[data-framer-name="' + cn + '"]');
      return x ? [...x.children].map((e) => num(txt(e))) : null;
    });
    if (cols.some((a) => !a || a.length !== 10 || a.some((v) => v == null))) return;
    seen[label] = true;
    judges.push({
      judge: label,
      name: txt(c.querySelector('[data-framer-name="Judge Title"]')),
      byTeam: cols,
      totals: CELLS.map((cn) => num(txt(c.querySelector('[data-framer-name="' + cn + ' Point"]')))),
    });
  });

  // fan-vote bonus split
  const voteInfo = [...document.querySelectorAll('[data-framer-name="Vote Info"]')]
    .filter(vis)
    .slice(0, 3)
    .map((e) => {
      const s = txt(e);
      const pctM = s.match(/(\d+)\s*%/);
      const voteM = s.match(/([\d,]+)\s*VOTES?/i);
      return { pct: pctM ? +pctM[1] : null, votes: voteM ? +voteM[1].replace(/,/g, "") : null };
    });

  return { teamNames, averages, judges, fanVote: voteInfo };
}

// Parse a team page's raw (server-rendered) HTML for meta + full roster.
// The roster lives in the SSR markup even though the live page hides most of
// it behind a "Load More" button, so a plain fetch is more reliable here.
function parseTeamHtml(html, id) {
  const strip = (s) =>
    s
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const title = strip((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "");
  // "BROTHERHOOD – VANCOUVER, CAN 's Team in the IDL ..."
  const tm = title.match(/^(.+?)\s+[–-]\s+([^,]+),\s*([A-Z]{2,3})/);
  const name = tm ? tm[1].trim() : id.toUpperCase();
  const city = tm ? tm[2].trim() : null;
  const country = tm && /^[A-Z]{3}$/.test(tm[3]) ? tm[3] : null;

  const foundedM = html.match(/Founded in (\d{4})/i) || html.match(/Since\s+(\d{4})/i);
  const founded = foundedM ? +foundedM[1] : null;

  const seen = new Set();
  const roster = [];
  for (const part of html.split('data-framer-name="Dancers"').slice(1)) {
    const seg = part.slice(0, 6000);
    const numM = seg.match(/>#(\d{1,3})</);
    const nameM = seg.match(/data-framer-name="Name Row"[\s\S]{0,400}?<p[^>]*>([^<]{2,60})<\/p>/);
    if (!nameM) continue;
    const dancer = strip(nameM[1]);
    if (!/^[A-Za-z]/.test(dancer) || seen.has(dancer)) continue;
    const natM = seg.match(/data-framer-name="Team Name"[\s\S]{0,1600}?<p[^>]*>\s*([A-Za-z]{2,4})\s*<\/p>/);
    seen.add(dancer);
    roster.push({
      number: numM ? +numM[1] : null,
      name: dancer,
      nationality: natM ? natM[1].toUpperCase() : null,
      captain: /\(C\)<\/p>/.test(seg),
    });
  }
  return { name, city, country, founded, roster };
}

/* ----------------------------------------------------------------- driver */

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXECUTABLE,
    headless: !HEADFUL,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1366, height: 1000 },
  });

  const data = {
    meta: {
      source: BASE,
      season: 2026,
      scrapedAt: new Date().toISOString(),
      note: "Unofficial fan project. All statistics scraped from idl.pro.",
    },
    criteria: [
      "Complexity of Choreography",
      "Staging",
      "Musicality",
      "Creativity",
      "Stylistic Athleticism",
      "Cleanliness",
      "Technical Execution + Authenticity",
      "Spacing",
      "Projection / Communication",
      "Stamina",
    ],
    judges: [],
    teams: [],
    events: [],
    standings: [],
  };

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  /* ---- standings (home page) ---- */
  console.log("· home / standings");
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await sleep(1500);
  const standings = await page.evaluate(() => {
    const lines = document.body.innerText.split("\n").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
    const start = lines.findIndex((l) => /2026 SEASON STANDINGS/i.test(l));
    if (start < 0) return [];
    const seg = lines.slice(start, start + 120);
    const teamNames = ["BROTHERHOOD", "1MILLION", "ROYAL FAMILY", "GRV", "JAM REPUBLIC", "QUICK STYLE"];
    const rows = [];
    for (let i = 0; i < seg.length; i++) {
      if (teamNames.includes(seg[i].toUpperCase())) {
        const nums = [];
        for (let j = i + 1; j < seg.length && nums.length < 6; j++) {
          if (/^-?\d+$/.test(seg[j])) nums.push(+seg[j]);
          else if (teamNames.includes(seg[j].toUpperCase())) break;
        }
        rows.push({ team: seg[i], perEvent: nums });
      }
      if (rows.length >= 6) break;
    }
    return rows;
  });

  /* ---- events ---- */
  for (const ev of EVENTS) {
    console.log("· event", ev.id);
    await page.goto(BASE + ev.path, { waitUntil: "networkidle2" });
    await sleep(1800);
    const summary = await page.evaluate(pageSummary);

    const record = {
      id: ev.id,
      series: ev.series,
      name: (summary.city || ev.id).replace(/\s+/g, " "),
      date: summary.date || null,
      dateISO: summary.date && !Number.isNaN(Date.parse(summary.date))
        ? new Date(summary.date).toISOString().slice(0, 10)
        : null,
      venue: summary.venue || null,
      podium: summary.podium.map((p) => ({
        team: teamId(p.team),
        teamName: p.team.replace(/\s+/g, " ").trim(),
        rank: p.rank,
        score: p.score,
      })),
      matches: [],
    };

    let prevFingerprint = null;
    for (const m of summary.matches) {
      // activate the tab for this match, then verify the panel actually changed
      let sc = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        const tagged = await page.evaluate((n) => {
          const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
          const tabs = [...document.querySelectorAll("div,button,a")].filter(
            (e) => txt(e) === "Match " + n && e.offsetParent !== null && e.childElementCount <= 1
          );
          const tab = tabs.find((e) => getComputedStyle(e).cursor === "pointer") || tabs[0];
          if (!tab) return null;
          tab.setAttribute("data-idl-tab", "1");
          tab.scrollIntoView({ block: "center" });
          return true;
        }, m.n);
        if (tagged) {
          try {
            await page.click('[data-idl-tab="1"]', { delay: 30 });
          } catch {
            /* fall through to re-tag */
          }
          await page.evaluate(() => {
            const t = document.querySelector('[data-idl-tab="1"]');
            if (t) t.removeAttribute("data-idl-tab");
          });
        }
        await sleep(900 + attempt * 500);
        sc = await page.evaluate(activeScorecard);
        const fp = JSON.stringify(sc.judges.map((j) => [j.name, j.a, j.b]));
        if (m.n === summary.matches[0].n || fp !== prevFingerprint || sc.judges.length === 0) {
          prevFingerprint = fp;
          break;
        }
      }

      const idA = teamId(m.teamA);
      const idB = teamId(m.teamB);

      const match = {
        n: m.n,
        teamA: idA,
        teamB: idB,
        teamAName: m.teamA.replace(/\s+/g, " ").trim(),
        teamBName: m.teamB.replace(/\s+/g, " ").trim(),
        pointsA: m.ptA,
        pointsB: m.ptB,
        winner: m.ptA === m.ptB ? null : m.ptA > m.ptB ? idA : idB,
        judges: sc.judges.map((j) => ({
          judge: j.judge,
          name: j.name,
          scoresA: j.a,
          scoresB: j.b,
          totalA: j.totalA,
          totalB: j.totalB,
          pointTo: j.pointA > j.pointB ? idA : j.pointB > j.pointA ? idB : null,
        })),
        criteriaAveragesA: sc.averages ? sc.averages.a : null,
        criteriaAveragesB: sc.averages ? sc.averages.b : null,
        avgTotalA: sc.averages ? sc.averages.totalA : null,
        avgTotalB: sc.averages ? sc.averages.totalB : null,
        fanVote: {
          pctA: sc.fan.pctA,
          pctB: sc.fan.pctB,
          votesA: sc.fan.votesA,
          votesB: sc.fan.votesB,
          pointTo: sc.fan.pointA > sc.fan.pointB ? idA : sc.fan.pointB > sc.fan.pointA ? idB : null,
        },
      };

      // sanity check: recomputed points from judge + fan allocation should match
      let ra = 0;
      let rb = 0;
      match.judges.forEach((j) => {
        if (j.pointTo === idA) ra++;
        else if (j.pointTo === idB) rb++;
      });
      if (match.fanVote.pointTo === idA) ra++;
      else if (match.fanVote.pointTo === idB) rb++;
      const ok = ra === m.ptA && rb === m.ptB;
      console.log(
        `  match ${m.n}: ${m.teamA} ${m.ptA}-${m.ptB} ${m.teamB}  (${match.judges.length} judges, recomputed ${ra}-${rb} ${ok ? "OK" : "MISMATCH"})`
      );
      record.matches.push(match);
    }

    /* ---- final round (the "Final Match" tab): the three match winners dance
       again for the podium, with a full three-team judge scoresheet ---- */
    const podiumSorted = record.podium.slice().sort((a, b) => a.rank - b.rank);
    const fr = {
      teams: podiumSorted.map((p) => ({
        team: p.team,
        teamName: p.teamName,
        rank: p.rank,
        score: p.score,
      })),
      scorecard: null,
    };

    for (let attempt = 0; attempt < 4; attempt++) {
      const tagged = await page.evaluate(() => {
        const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
        const tab = [...document.querySelectorAll(".framer-nnuiyo, div, button, a")].find(
          (e) => txt(e) === "Final Match" && e.offsetParent !== null && e.childElementCount <= 1
        );
        if (!tab) return false;
        tab.setAttribute("data-idl-tab", "1");
        tab.scrollIntoView({ block: "center" });
        return true;
      });
      if (!tagged) break;
      try {
        await page.click('[data-idl-tab="1"]', { delay: 40 });
      } catch {
        /* re-tag & retry */
      }
      await page.evaluate(() => {
        const t = document.querySelector('[data-idl-tab="1"]');
        if (t) t.removeAttribute("data-idl-tab");
      });
      await sleep(1100 + attempt * 500);

      const sc = await page.evaluate(activeFinalScorecard);
      if (sc && sc.judges.length === 6 && sc.averages) {
        // Cell A / B / C are the podium's 1st / 2nd / 3rd
        const ids = podiumSorted.map((p) => p.team);
        const perTeam = (arrByCell) => Object.fromEntries(ids.map((id, i) => [id, arrByCell[i]]));
        fr.scorecard = {
          judges: sc.judges.map((j) => ({
            judge: j.judge,
            name: j.name,
            scores: perTeam(j.byTeam),
            totals: perTeam(j.totals),
            // the judge's pick = the team they scored highest
            pickTo: ids[j.totals.indexOf(Math.max(...j.totals))],
          })),
          criteriaAverages: perTeam(sc.averages.byTeam),
          avgTotals: perTeam(sc.averages.totals),
          fanVote: Object.fromEntries(
            ids.map((id, i) => [id, sc.fanVote[i] || { pct: null, votes: null }])
          ),
        };
        break;
      }
    }
    record.finalRound = fr;
    console.log(
      `  final round: ${fr.teams.map((t) => `${t.teamName} ${t.score}`).join(" · ")}` +
        (fr.scorecard ? ` (+ scoresheet, ${fr.scorecard.judges.length} judges)` : " (scores only)")
    );

    data.events.push(record);
  }

  /* ---- judges roster (unique names, with the events they judged) ---- */
  const judgeMap = {};
  for (const ev of data.events)
    for (const m of ev.matches)
      for (const j of m.judges)
        if (j.name) (judgeMap[j.name] ||= new Set()).add(ev.id);
  data.judges = Object.entries(judgeMap)
    .map(([name, evs]) => ({ name, events: [...evs] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  /* ---- teams ---- */
  for (const t of TEAM_PAGES) {
    console.log("· team", t);
    const html = await fetch(`${BASE}/teams/${t}`, {
      headers: { "user-agent": "Mozilla/5.0 (idl-stats scraper)" },
    }).then((r) => r.text());
    const meta = parseTeamHtml(html, t);
    console.log(`  ${meta.name}: ${meta.roster.length} dancers, founded ${meta.founded}`);
    data.teams.push({ id: t, ...meta });
  }

  /* ---- standings: reconcile scraped per-event points ---- */
  data.standings = standings.map((row) => {
    const id = teamId(row.team);
    const perEvent = {};
    EVENTS.forEach((ev, i) => {
      if (row.perEvent[i] != null) perEvent[ev.id] = row.perEvent[i];
    });
    const total = Object.values(perEvent).reduce((a, b) => a + b, 0);
    return { team: id, teamName: row.team, perEvent, total };
  });
  data.standings.sort((a, b) => b.total - a.total);
  data.standings.forEach((s, i) => (s.rank = i + 1));

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(data, null, 2));
  await browser.close();

  const nMatches = data.events.reduce((a, e) => a + e.matches.length, 0);
  const nJudgeRows = data.events.reduce(
    (a, e) => a + e.matches.reduce((x, m) => x + m.judges.length, 0),
    0
  );
  console.log(
    `\n✓ wrote ${OUT}\n  ${data.events.length} events, ${nMatches} matches, ${nJudgeRows} judge scorecards, ${data.teams.length} teams`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
