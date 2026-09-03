import React, { useState } from "react";
import { teams, color, teamName, nf, CRITERIA_SHORT } from "../lib/data.js";
import { teamSummary, headToHead, metricByEvent, TREND_METRICS } from "../lib/stats.js";
import { CriteriaRadar, TeamLineChart } from "../charts.jsx";
import { Panel, TeamChip, SectionNote } from "../components.jsx";

const ROWS = [
  { key: "seasonPoints", label: "League points", fmt: (v) => v, higher: true },
  { key: "winRate", label: "Match win rate", fmt: (v) => `${Math.round(v * 100)}%`, higher: true },
  { key: "avgScore", label: "Avg judge score", fmt: (v) => nf(v, 1), higher: true },
  { key: "judgePointRate", label: "Judge-point win rate", fmt: (v) => `${Math.round(v * 100)}%`, higher: true },
  { key: "fanWinRate", label: "Fan-vote win rate", fmt: (v) => `${Math.round(v * 100)}%`, higher: true },
  { key: "avgFanShare", label: "Avg fan-vote share", fmt: (v) => `${nf(v, 0)}%`, higher: true },
  { key: "pointsFor", label: "Battle points won", fmt: (v) => v, higher: true },
  { key: "pointsAgainst", label: "Battle points conceded", fmt: (v) => v, higher: false },
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

      <div className="grid grid--2">
        <Panel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <TeamChip id={a} large />
            <span className="tiny">head to head</span>
            <TeamChip id={b} large />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 18,
              fontSize: "2.4rem",
              fontWeight: 800,
              margin: "14px 0 6px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ color: color(a) }}>{h2h.aWins}</span>
            <span className="muted">–</span>
            <span style={{ color: color(b) }}>{h2h.bWins}</span>
          </div>
          <div className="tiny" style={{ textAlign: "center" }}>
            {h2h.meetings.length
              ? `${h2h.meetings.length} meeting${h2h.meetings.length > 1 ? "s" : ""} this season`
              : "have not met this season"}
          </div>
          {h2h.meetings.map((m, i) => (
            <div
              key={i}
              className="tooltip__row"
              style={{ borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 8 }}
            >
              <span className="k">
                {m.eventName.split(" ")[0]} · Battle {m.matchNo}
              </span>
              <span className="v">
                <span style={{ color: m.winner === a ? color(a) : undefined }}>{m.aPts}</span>
                {" – "}
                <span style={{ color: m.winner === b ? color(b) : undefined }}>{m.bPts}</span>
                <span className="muted" style={{ marginLeft: 8 }}>
                  ({nf(m.aAvg, 1)} / {nf(m.bAvg, 1)})
                </span>
              </span>
            </div>
          ))}
        </Panel>

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
      </div>

      <div className="section">
        <h2>Criteria profile</h2>
        <Panel hint="season average per criterion, /10">
          <CriteriaRadar
            labels={CRITERIA_SHORT}
            series={[
              { id: a, values: sa.critByIdx },
              { id: b, values: sb.critByIdx },
            ]}
            height={380}
          />
        </Panel>
      </div>

      <div className="section">
        <h2>Stage by stage</h2>
        <Panel
          hint={metric.label}
          style={{ paddingBottom: 8 }}
        >
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
          <TeamLineChart
            rows={trend}
            teamIds={[a, b]}
            height={300}
            yDomain={metric.domain}
            yTickFmt={isPct ? (v) => `${Math.round(v * 100)}%` : undefined}
            valueFmt={
              isPct
                ? (v) => (v == null ? "–" : `${Math.round(v * 100)}%`)
                : (v) => (v == null ? "–" : v.toFixed(1))
            }
          />
        </Panel>
        <SectionNote>
          Lines break where a team had no battle that stage (only three of six
          teams dance each night).
        </SectionNote>
      </div>
    </>
  );
}
