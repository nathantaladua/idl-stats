import React, { useState } from "react";
import { events, color, teamName, nf, CRITERIA_SHORT } from "../lib/data.js";
import { Panel, TeamChip, TeamLogo, SectionNote } from "../components.jsx";

function ScoreBar({ a, b, ca, cb, max = 10 }) {
  const at = (ca / max) * 50;
  const bt = (cb / max) * 50;
  return (
    <div className="cmp__track" style={{ height: 10 }}>
      <div className="cmp__fill" style={{ left: `${50 - at}%`, width: `${at}%`, background: color(a), opacity: ca >= cb ? 1 : 0.5 }} />
      <div className="cmp__fill" style={{ left: "50%", width: `${bt}%`, background: color(b), opacity: cb >= ca ? 1 : 0.5 }} />
    </div>
  );
}

function FullScorecard({ match }) {
  const { teamA: a, teamB: b } = match;
  return (
    <div style={{ overflowX: "auto", marginTop: 12 }}>
      <table className="data" style={{ minWidth: 640 }}>
        <thead>
          <tr>
            <th>Criterion</th>
            {match.judges.map((j) => (
              <th key={j.name} title={j.name}>
                {j.name.split(" ").map((w) => w[0]).join("")}
              </th>
            ))}
            <th>Avg</th>
          </tr>
        </thead>
        <tbody>
          {CRITERIA_SHORT.map((label, i) => (
            <React.Fragment key={label}>
              <tr>
                <td rowSpan={2}>{label}</td>
                {match.judges.map((j) => (
                  <td key={j.name} className="num" style={{ color: color(a) }}>
                    {j.scoresA[i]}
                  </td>
                ))}
                <td className="num" style={{ color: color(a) }}>
                  {nf(match.criteriaAveragesA[i], 1)}
                </td>
              </tr>
              <tr style={{ borderBottom: "2px solid var(--line-strong)" }}>
                {match.judges.map((j) => (
                  <td key={j.name} className="num" style={{ color: color(b) }}>
                    {j.scoresB[i]}
                  </td>
                ))}
                <td className="num" style={{ color: color(b) }}>
                  {nf(match.criteriaAveragesB[i], 1)}
                </td>
              </tr>
            </React.Fragment>
          ))}
          <tr>
            <td>Total</td>
            {match.judges.map((j) => (
              <td key={j.name} className="num">
                <span style={{ color: color(a) }}>{nf(j.totalA, 0)}</span>
                <span className="muted"> / </span>
                <span style={{ color: color(b) }}>{nf(j.totalB, 0)}</span>
              </td>
            ))}
            <td className="num">
              <span style={{ color: color(a) }}>{nf(match.avgTotalA, 1)}</span>
              <span className="muted"> / </span>
              <span style={{ color: color(b) }}>{nf(match.avgTotalB, 1)}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <SectionNote>Top row {teamName(a)} · bottom row {teamName(b)} · each cell /10.</SectionNote>
    </div>
  );
}

function Match({ match }) {
  const [open, setOpen] = useState(false);
  const { teamA: a, teamB: b } = match;
  return (
    <div className="panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="tiny">Match {match.n}</span>
          <TeamLogo id={a} small />
          <span style={{ fontSize: "1.6rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: match.winner === a ? color(a) : "var(--text-muted)" }}>{match.pointsA}</span>
            <span className="muted"> – </span>
            <span style={{ color: match.winner === b ? color(b) : "var(--text-muted)" }}>{match.pointsB}</span>
          </span>
          <TeamLogo id={b} small />
        </div>
        <span className="tiny">
          winner: <b style={{ color: color(match.winner) }}>{teamName(match.winner)}</b>
        </span>
      </div>

      <div className="tiny" style={{ margin: "12px 0 4px" }}>Judge &amp; fan points (6 judges + 1 fan vote)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {match.judges.map((j) => (
          <span
            key={j.name}
            className="pill"
            title={`${j.name}: ${nf(j.totalA, 0)} / ${nf(j.totalB, 0)}`}
            style={{ color: color(j.pointTo), borderColor: color(j.pointTo) }}
          >
            {j.name.split(" ")[0]} ▸ {teamName(j.pointTo).split(" ")[0]}
          </span>
        ))}
        <span
          className="pill"
          title={`${match.fanVote.votesA?.toLocaleString() ?? "?"} / ${match.fanVote.votesB?.toLocaleString() ?? "?"} votes`}
          style={{ color: color(match.fanVote.pointTo), borderColor: color(match.fanVote.pointTo) }}
        >
          Fans ▸ {teamName(match.fanVote.pointTo).split(" ")[0]} ({match.fanVote.pctA}/{match.fanVote.pctB})
        </span>
      </div>

      <div className="tiny" style={{ margin: "14px 0 6px" }}>Average score by criterion</div>
      <table className="data">
        <tbody>
          {CRITERIA_SHORT.map((label, i) => (
            <tr key={label}>
              <td style={{ width: 96 }}>{label}</td>
              <td className="num" style={{ width: 44, color: color(a) }}>
                {nf(match.criteriaAveragesA[i], 1)}
              </td>
              <td style={{ width: "60%" }}>
                <ScoreBar a={a} b={b} ca={match.criteriaAveragesA[i]} cb={match.criteriaAveragesB[i]} />
              </td>
              <td className="num" style={{ width: 44, textAlign: "left", color: color(b) }}>
                {nf(match.criteriaAveragesB[i], 1)}
              </td>
            </tr>
          ))}
          <tr>
            <td>Total</td>
            <td className="num" style={{ color: color(a) }}>{nf(match.avgTotalA, 1)}</td>
            <td />
            <td className="num" style={{ textAlign: "left", color: color(b) }}>{nf(match.avgTotalB, 1)}</td>
          </tr>
        </tbody>
      </table>

      <button className="pill" style={{ marginTop: 12 }} aria-pressed={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide" : "Show"} full judge scorecard
      </button>
      {open && <FullScorecard match={match} />}
    </div>
  );
}

export default function Matches() {
  const [evId, setEvId] = useState(events[events.length - 1].id);
  const ev = events.find((e) => e.id === evId);

  return (
    <>
      <div className="page-head">
        <h1>Matches &amp; scorecards</h1>
        <p>
          Every head-to-head match with its judge-by-judge and fan-vote breakdown.
          Three matches per series; the winners meet again in the final round.
        </p>
      </div>

      <div className="controls">
        <div className="seg" role="tablist">
          {events.map((e) => (
            <button key={e.id} aria-pressed={e.id === evId} onClick={() => setEvId(e.id)}>
              S{e.series} · {e.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <Panel hint={`${ev.dateISO || ""} · ${ev.venue || ""}`} title={`Series ${ev.series} — ${ev.name}`}>
        <div className="tiny" style={{ marginBottom: 10 }}>Final-round result</div>
        <div className="grid grid--tiles">
          {ev.podium.map((p) => (
            <div key={p.team} className="tile" style={{ borderLeftColor: color(p.team) }}>
              <div className="tile__label">
                {p.rank === 1 ? "🥇 Winner" : p.rank === 2 ? "🥈 2nd" : "🥉 3rd"}
              </div>
              <div className="tile__value" style={{ fontSize: "1.3rem" }}>
                <TeamChip id={p.team} />
              </div>
              <div className="tile__sub">{nf(p.score, 2)} score</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid" style={{ marginTop: 14, gap: 14 }}>
        {ev.matches.map((m) => (
          <Match key={m.n} match={m} />
        ))}
      </div>
    </>
  );
}
