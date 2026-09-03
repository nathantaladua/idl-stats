import React, { useState } from "react";
import { teams, color, teamName, nf, int, CRITERIA_SHORT } from "../lib/data.js";
import { teamSummary, headToHead, metricByEvent, TREND_METRICS } from "../lib/stats.js";
import { CriteriaRadar, TeamLineChart, Zoomable } from "../charts.jsx";
import { Panel, TeamLogo, SectionNote } from "../components.jsx";

const ROWS = [
  { key: "seasonPoints", label: "Series points", fmt: int, higher: true },
  { key: "winRate", label: "Match win rate", fmt: (v) => `${Math.round(v * 100)}%`, higher: true },
  { key: "avgScore", label: "Avg judge score", fmt: (v) => nf(v, 1), higher: true },
  { key: "judgePointRate", label: "Judge-point win rate", fmt: (v) => `${Math.round(v * 100)}%`, higher: true },
  { key: "fanWinRate", label: "Fan-vote win rate", fmt: (v) => `${Math.round(v * 100)}%`, higher: true },
  { key: "avgFanShare", label: "Avg fan-vote share", fmt: (v) => `${nf(v, 0)}%`, higher: true },
  { key: "pointsFor", label: "Match points won", fmt: int, higher: true },
  { key: "pointsAgainst", label: "Match points conceded", fmt: int, higher: false },
];

function CompareBar({ label, a, b, av, bv, fmt, higher }) {
  const total = (Math.abs(av) || 0) + (Math.abs(bv) || 0) || 1;
  const aShare = (Math.abs(av) || 0) / total;
  const aLeads = higher ? av > bv : av < bv;
  const bLeads = higher ? bv > av : bv < av;
  return (
    <div className="cmp__bar">
      <div className="label">{label}</div>
      <div className="cmp__val l" style={{ color: aLeads ? color(a) : "var(--text-secondary)" }}>
        {fmt(av)}
      </div>
      <div className="cmp__track" title={`${teamName(a)} vs ${teamName(b)}`}>
        <div
          className="cmp__fill"
          style={{ left: 0, width: `${aShare * 100}%`, background: color(a), opacity: aLeads ? 1 : 0.5 }}
        />
        <div
          className="cmp__fill"
          style={{ right: 0, width: `${(1 - aShare) * 100}%`, background: color(b), opacity: bLeads ? 1 : 0.5 }}
        />
      </div>
      <div className="cmp__val" style={{ color: bLeads ? color(b) : "var(--text-secondary)" }}>
        {fmt(bv)}
      </div>
    </div>
  );
}

export default function Compare() {
  const ids = teams.map((t) => t.id);
  const [a, setA] = useState("brotherhood");
  const [b, setB] = useState("1-million");
  const [metricKey, setMetricKey] = useState("avgScore");

  const sa = teamSummary(a);
  const sb = teamSummary(b);
  const h2h = headToHead(a, b);
  const metric = TREND_METRICS.find((m) => m.key === metricKey);
  const trend = metricByEvent(metricKey);
  const isPct = metric.pctScale;
  const isInt = metricKey === "points";

  return (
    <>
      <div className="page-head">
        <h1>Compare teams</h1>
        <p>Two teams, every shared metric side by side, plus their head-to-head record.</p>
      </div>

      <div className="controls">
        <label className="field">
          <span>Team A</span>
          <select value={a} onChange={(e) => setA(e.target.value)}>
            {ids.filter((x) => x !== b).map((id) => (
              <option key={id} value={id}>
                {teamName(id)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Team B</span>
          <select value={b} onChange={(e) => setB(e.target.value)}>
            {ids.filter((x) => x !== a).map((id) => (
              <option key={id} value={id}>
                {teamName(id)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Panel>
        <div className="cmp-head">
          <div style={{ justifySelf: "start" }}>
            <TeamLogo id={a} />
          </div>
          <div className="cmp-head__score">
            <span style={{ color: color(a) }}>{h2h.aWins}</span>
            <span className="muted"> – </span>
            <span style={{ color: color(b) }}>{h2h.bWins}</span>
          </div>
          <div style={{ justifySelf: "end" }}>
            <TeamLogo id={b} />
          </div>
        </div>
        <div className="tiny" style={{ textAlign: "center", marginTop: 6 }}>
          {h2h.meetings.length
            ? `head-to-head · ${h2h.meetings.length} meeting${h2h.meetings.length > 1 ? "s" : ""} this season`
            : "these teams have not met this season"}
        </div>
        {h2h.meetings.length > 0 && (
          <div className="cmp-meetings">
            {h2h.meetings.map((m, i) => (
              <span className="cmp-meeting" key={i}>
                <span className="m-when">
                  {m.eventName} · Match {m.matchNo}
                </span>
                <span>
                  <b style={{ color: m.winner === a ? color(a) : undefined }}>{m.aPts}</b>
                  <span className="muted">–</span>
                  <b style={{ color: m.winner === b ? color(b) : undefined }}>{m.bPts}</b>
                </span>
                <span className="muted">
                  {nf(m.aAvg, 1)} / {nf(m.bAvg, 1)}
                </span>
              </span>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid--2" style={{ marginTop: 14 }}>
        <Panel title="Season metrics" hint="brighter bar = leader">
          <div className="cmp">
            {ROWS.map((r) => (
              <CompareBar
                key={r.key}
                label={r.label}
                a={a}
                b={b}
                av={sa[r.key]}
                bv={sb[r.key]}
                fmt={r.fmt}
                higher={r.higher}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Criteria profile" hint="season avg per criterion, /10">
          <Zoomable>
            <CriteriaRadar
              labels={CRITERIA_SHORT}
              series={[
                { id: a, values: sa.critByIdx },
                { id: b, values: sb.critByIdx },
              ]}
              height={360}
            />
          </Zoomable>
        </Panel>
      </div>

      <div className="section">
        <h2>Series by series</h2>
        <Panel hint={metric.label}>
          <div className="controls" style={{ marginBottom: 6 }}>
            <label className="field">
              <span>Metric</span>
              <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
                {TREND_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Zoomable>
            <TeamLineChart
              rows={trend}
              teamIds={[a, b]}
              height={300}
              yDomain={metric.domain}
              yTickFmt={isPct ? (v) => `${Math.round(v * 100)}%` : isInt ? int : undefined}
              valueFmt={
                isPct
                  ? (v) => (v == null ? "–" : `${Math.round(v * 100)}%`)
                  : isInt
                    ? (v) => (v == null ? "–" : int(v))
                    : (v) => (v == null ? "–" : v.toFixed(1))
              }
            />
          </Zoomable>
          <SectionNote>
            Lines break where a team had no match that series (only three of six
            teams dance each night).
          </SectionNote>
        </Panel>
      </div>
    </>
  );
}
