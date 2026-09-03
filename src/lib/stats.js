import { data, events, teams, team } from "./data.js";

/**
 * Flatten every match into a team-centric row so per-team aggregates are a
 * simple reduce. One match produces two rows (one per side).
 */
export function teamMatchRows(teamId) {
  const rows = [];
  for (const ev of events) {
    ev.matches.forEach((m) => {
      const isA = m.teamA === teamId;
      const isB = m.teamB === teamId;
      if (!isA && !isB) return;
      const opp = isA ? m.teamB : m.teamA;
      const ourPts = isA ? m.pointsA : m.pointsB;
      const oppPts = isA ? m.pointsB : m.pointsA;
      const ourAvg = isA ? m.avgTotalA : m.avgTotalB;
      const oppAvg = isA ? m.avgTotalB : m.avgTotalA;
      const fanPct = isA ? m.fanVote.pctA : m.fanVote.pctB;
      const fanVotes = isA ? m.fanVote.votesA : m.fanVote.votesB;
      const judgePts = m.judges.filter((j) => j.pointTo === teamId).length;
      const crit = isA ? m.criteriaAveragesA : m.criteriaAveragesB;
      const judgeTotals = m.judges.map((j) => (isA ? j.totalA : j.totalB));
      rows.push({
        eventId: ev.id,
        eventName: ev.name,
        series: ev.series,
        date: ev.dateISO,
        matchNo: m.n,
        opponent: opp,
        won: m.winner === teamId,
        drawn: m.winner == null,
        ourPts,
        oppPts,
        ourAvg,
        oppAvg,
        fanPct,
        fanVotes,
        fanWon: m.fanVote.pointTo === teamId,
        judgePts,
        judgeTotals,
        crit,
      });
    });
  }
  return rows;
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export function teamSummary(teamId) {
  const rows = teamMatchRows(teamId);
  const st = data.standings.find((s) => s.team === teamId) || { perEvent: {}, total: 0 };
  const wins = rows.filter((r) => r.won).length;
  const losses = rows.filter((r) => !r.won && !r.drawn).length;

  const podiums = { 1: 0, 2: 0, 3: 0 };
  const podiumScores = [];
  for (const ev of events) {
    const p = ev.podium.find((x) => x.team === teamId);
    if (p) {
      podiums[p.rank] = (podiums[p.rank] || 0) + 1;
      podiumScores.push(p.score);
    }
  }

  const critByIdx = data.criteria.map((_, i) =>
    mean(rows.map((r) => r.crit && r.crit[i]).filter((x) => x != null))
  );
  const bestCritIdx = critByIdx.reduce(
    (best, v, i) => (v != null && (best < 0 || v > critByIdx[best]) ? i : best),
    -1
  );
  const worstCritIdx = critByIdx.reduce(
    (w, v, i) => (v != null && (w < 0 || v < critByIdx[w]) ? i : w),
    -1
  );

  const judgePtsWon = rows.reduce((a, r) => a + r.judgePts, 0);
  const judgePtsTotal = rows.length * 6;

  return {
    id: teamId,
    meta: team(teamId),
    played: rows.length,
    wins,
    losses,
    winRate: rows.length ? wins / rows.length : 0,
    pointsFor: rows.reduce((a, r) => a + r.ourPts, 0),
    pointsAgainst: rows.reduce((a, r) => a + r.oppPts, 0),
    seasonPoints: st.total,
    seasonRank: st.rank,
    perEventPoints: st.perEvent,
    avgScore: mean(rows.flatMap((r) => r.judgeTotals)),
    avgMatchScore: mean(rows.map((r) => r.ourAvg).filter((x) => x != null)),
    judgePointRate: judgePtsTotal ? judgePtsWon / judgePtsTotal : 0,
    fanWinRate: rows.length ? rows.filter((r) => r.fanWon).length / rows.length : 0,
    avgFanShare: mean(rows.map((r) => r.fanPct).filter((x) => x != null)),
    totalFanVotes: rows.reduce((a, r) => a + (r.fanVotes || 0), 0),
    podiums,
    avgPodiumScore: mean(podiumScores),
    critByIdx,
    bestCritIdx,
    worstCritIdx,
    rows,
  };
}

export function allSummaries() {
  return teams.map((t) => teamSummary(t.id));
}

/** Cumulative season points after each event, per team — for the progression chart. */
export function pointsProgression() {
  return events.map((ev, i) => {
    const point = { event: ev.name, series: ev.series };
    for (const t of teams) {
      const st = data.standings.find((s) => s.team === t.id);
      let cum = 0;
      for (let k = 0; k <= i; k++) cum += (st?.perEvent[events[k].id]) || 0;
      point[t.id] = cum;
    }
    return point;
  });
}

/** Per-event value of one metric for every team — generic trend series builder. */
export function metricByEvent(metricKey) {
  return events.map((ev) => {
    const point = { event: ev.name, series: ev.series };
    for (const t of teams) {
      const rows = teamMatchRows(t.id).filter((r) => r.eventId === ev.id);
      point[t.id] = eventMetric(metricKey, t.id, ev, rows);
    }
    return point;
  });
}

function eventMetric(key, teamId, ev, rows) {
  if (!rows.length && key !== "points") return null;
  switch (key) {
    case "points":
      return (data.standings.find((s) => s.team === teamId)?.perEvent[ev.id]) ?? 0;
    case "avgScore":
      return mean(rows.flatMap((r) => r.judgeTotals));
    case "matchWinRate":
      return rows.filter((r) => r.won).length / rows.length;
    case "judgePointRate":
      return rows.reduce((a, r) => a + r.judgePts, 0) / (rows.length * 6);
    case "fanShare":
      return mean(rows.map((r) => r.fanPct).filter((x) => x != null));
    case "matchPointMargin":
      return mean(rows.map((r) => r.ourPts - r.oppPts));
    default:
      return null;
  }
}

export const TREND_METRICS = [
  { key: "points", label: "Series points earned", unit: "pts", domain: [0, 14] },
  { key: "avgScore", label: "Avg judge score", unit: "/100", domain: [70, 100] },
  { key: "matchWinRate", label: "Match win rate", unit: "%", pctScale: true, domain: [0, 1] },
  { key: "judgePointRate", label: "Judge-point win rate", unit: "%", pctScale: true, domain: [0, 1] },
  { key: "fanShare", label: "Fan-vote share", unit: "%", domain: [0, 100] },
  { key: "matchPointMargin", label: "Avg match-point margin", unit: "pts", domain: [-7, 7] },
];

/** Head-to-head record and score aggregates between two teams. */
export function headToHead(aId, bId) {
  const meetings = [];
  for (const ev of events) {
    for (const m of ev.matches) {
      const pair =
        (m.teamA === aId && m.teamB === bId) ||
        (m.teamA === bId && m.teamB === aId);
      if (!pair) continue;
      const aIsA = m.teamA === aId;
      meetings.push({
        eventName: ev.name,
        series: ev.series,
        matchNo: m.n,
        aPts: aIsA ? m.pointsA : m.pointsB,
        bPts: aIsA ? m.pointsB : m.pointsA,
        aAvg: aIsA ? m.avgTotalA : m.avgTotalB,
        bAvg: aIsA ? m.avgTotalB : m.avgTotalA,
        winner: m.winner,
      });
    }
  }
  return {
    meetings,
    aWins: meetings.filter((x) => x.winner === aId).length,
    bWins: meetings.filter((x) => x.winner === bId).length,
  };
}

/** A team's record in the final round (the "round 2" three-team dance-off
 *  that sets each series' podium). idl.pro publishes the three scores only. */
export function finalRoundSummary(teamId) {
  const apps = [];
  for (const ev of events) {
    const fr = ev.finalRound;
    if (!fr) continue;
    const e = fr.teams.find((t) => t.team === teamId);
    if (e) apps.push({ eventId: ev.id, eventName: ev.name, rank: e.rank, score: e.score });
  }
  return {
    appearances: apps.length,
    wins: apps.filter((a) => a.rank === 1).length,
    bestRank: apps.length ? Math.min(...apps.map((a) => a.rank)) : null,
    avgScore: apps.length ? mean(apps.map((a) => a.score)) : null,
    apps,
  };
}

/** Nationality breakdown of a roster. */
export function rosterNationalities(teamId) {
  const counts = {};
  for (const d of team(teamId).roster) {
    const k = d.nationality || "—";
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([code, n]) => ({ code, n }))
    .sort((a, b) => b.n - a.n);
}

/** Judge tendencies: for each judge, average score given and how often the
 *  higher score aligned with the eventual match winner. */
export function judgeTendencies() {
  const map = {};
  for (const ev of events) {
    for (const m of ev.matches) {
      for (const j of m.judges) {
        const rec = (map[j.name] ||= {
          name: j.name,
          events: new Set(),
          given: [],
          points: 0,
          withWinner: 0,
          n: 0,
        });
        rec.events.add(ev.id);
        rec.given.push(j.totalA, j.totalB);
        rec.n += 1;
        if (j.pointTo) rec.points += 1;
        if (j.pointTo && j.pointTo === m.winner) rec.withWinner += 1;
      }
    }
  }
  return Object.values(map)
    .map((r) => ({
      name: r.name,
      events: [...r.events].length,
      matches: r.n,
      avgGiven: mean(r.given),
      chalkRate: r.points ? r.withWinner / r.points : null,
    }))
    .sort((a, b) => b.avgGiven - a.avgGiven);
}
