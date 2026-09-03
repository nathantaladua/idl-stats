import React, { useState } from "react";
import { teams, color, teamName, nf, int, CRITERIA_SHORT } from "../lib/data.js";
import {
  teamSummary,
  headToHead,
  metricByEvent,
  finalRoundSummary,
  TREND_METRICS,
} from "../lib/stats.js";
import { CriteriaRadar, TeamLineChart, useChartView, ChartToolbar, ChartFrame } from "../charts.jsx";
import { Panel, TeamLogo, TeamChip, SectionNote } from "../components.jsx";

const NONE = "—";

const ROWS = [
  { key: "seasonPoints", label: "Series points", fmt: int, better: "high" },
  { key: "winRate", label: "Match win rate", fmt: (v) => `${Math.round(v * 100)}%`, better: "high" },
  { key: "avgScore", label: "Avg judge score", fmt: (v) => nf(v, 1), better: "high" },
  { key: "judgePointRate", label: "Judge-point win rate", fmt: (v) => `${Math.round(v * 100)}%`, better: "high" },
  { key: "fanWinRate", label: "Fan-vote win rate", fmt: (v) => `${Math.round(v * 100)}%`, better: "high" },
  { key: "avgFanShare", label: "Avg fan-vote share", fmt: (v) => `${nf(v, 0)}%`, better: "high" },
  { key: "pointsFor", label: "Match points won", fmt: int, better: "high" },
  { key: "pointsAgainst", label: "Match points conceded", fmt: int, better: "low" },
];

function MetricRow({ label, picks, values, fmt, better }) {
  const nums = values.map((v) => (v == null ? 0 : Math.abs(v)));
  const max = Math.max(...nums, 1e-9);
  const best = better === "high" ? Math.max(...values) : Math.min(...values);
  return (
    <div className="mrow" style={{ gridTemplateColumns: `140px repeat(${picks.length}, 1fr)` }}>
      <div className="mrow__label">{label}</div>
      {picks.map((id, i) => {
        const v = values[i];
        const lead = v === best;
        return (
          <div className="mrow__cell" key={id}>
            <span className="mrow__val" style={{ color: lead ? color(id) : "var(--text-secondary)" }}>
              {fmt(v)}
            </span>
            <span className="mrow__track">
              <span
                className="mrow__fill"
                style={{
                  width: `${(nums[i] / max) * 100}%`,
                  background: color(id),
                  opacity: lead ? 1 : 0.45,
                }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function pairs(list) {
  const out = [];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) out.push([list[i], list[j]]);
  return out;
}

export default function Compare() {
  const ids = teams.map((t) => t.id);
  const [a, setA] = useState("brotherhood");
  const [b, setB] = useState("1-million");
  const [c, setC] = useState(NONE);
  const [metricKey, setMetricKey] = useState("avgScore");

  const picks = [a, b, c].filter((x) => x && x !== NONE);
  const summaries = picks.map((id) => teamSummary(id));
  const finals = picks.map((id) => finalRoundSummary(id));
  const metric = TREND_METRICS.find((m) => m.key === metricKey);
  const trend = metricByEvent(metricKey);
  const isPct = metric.pctScale;
  const isInt = metricKey === "points";

  const lineValues = trend.flatMap((r) => picks.map((id) => r[id]));
  const view = useChartView(lineValues, { pctScale: isPct });

  const sel = (value, setValue, others, optional) => (
    <select value={value} onChange={(e) => setValue(e.target.value)}>
      {optional && <option value={NONE}>— none —</option>}
      {ids
        .filter((id) => !others.includes(id))
        .map((id) => (
          <option key={id} value={id}>
            {teamName(id)}
          </option>
        ))}
    </select>
  );

  return (
    <>
      <div className="page-head">
        <h1>Compare teams</h1>
        <p>
          Two or three teams, every shared metric side by side, head-to-head
          records, the criteria radar and their series-by-series lines.
        </p>
      </div>

      <div className="controls">
        <label className="field">
          <span>Team A</span>
          {sel(a, setA, [b, c], false)}
        </label>
        <label className="field">
          <span>Team B</span>
          {sel(b, setB, [a, c], false)}
        </label>
        <label className="field">
          <span>Team C (optional)</span>
          {sel(c, setC, [a, b], true)}
        </label>
      </div>

      <Panel title="Head to head" hint={picks.length === 3 ? "pairwise records" : "this season"}>
        <div className="h2h-grid">
          {pairs(picks).map(([x, y]) => {
            const h = headToHead(x, y);
            return (
              <div className="h2h" key={x + y}>
                <TeamChip id={x} />
                <span className="h2h__score">
                  <b style={{ color: color(x) }}>{h.aWins}</b>
                  <span className="muted">–</span>
                  <b style={{ color: color(y) }}>{h.bWins}</b>
                </span>
                <TeamChip id={y} />
                <div className="h2h__meetings">
                  {h.meetings.length
                    ? h.meetings.map((m, i) => (
                        <span key={i}>
                          {m.eventName.split(" ")[0]} M{m.matchNo}: {m.aPts}–{m.bPts}
                        </span>
                      ))
                    : "no meeting"}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid--2" style={{ marginTop: 14 }}>
        <Panel title="Season metrics" hint="bar = share of the group's best">
          <div className="mtable">
            {ROWS.map((r) => (
              <MetricRow
                key={r.key}
                label={r.label}
                picks={picks}
                values={summaries.map((s) => s[r.key])}
                fmt={r.fmt}
                better={r.better}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Criteria profile" hint="season avg per criterion, /10">
          <CriteriaRadar
            labels={CRITERIA_SHORT}
            series={picks.map((id, i) => ({ id, values: summaries[i].critByIdx }))}
            height={360}
          />
        </Panel>
      </div>

      <div className="section">
        <h2>Final round (round 2)</h2>
        <Panel hint="the three-team dance-off that sets each series podium">
          <div className="mtable">
            <MetricRow
              label="Appearances"
              picks={picks}
              values={finals.map((f) => f.appearances)}
              fmt={int}
              better="high"
            />
            <MetricRow
              label="Final-round wins"
              picks={picks}
              values={finals.map((f) => f.wins)}
              fmt={int}
              better="high"
            />
            <MetricRow
              label="Best finish"
              picks={picks}
              values={finals.map((f) => f.bestRank ?? 9)}
              fmt={(v) => (v === 9 ? "–" : v === 1 ? "1st" : v === 2 ? "2nd" : "3rd")}
              better="low"
            />
            <MetricRow
              label="Avg final score"
              picks={picks}
              values={finals.map((f) => f.avgScore ?? 0)}
              fmt={(v) => (v ? nf(v, 2) : "–")}
              better="high"
            />
            <MetricRow
              label="Avg judge score (final)"
              picks={picks}
              values={finals.map((f) => f.avgJudgeScore ?? 0)}
              fmt={(v) => (v ? nf(v, 1) : "–")}
              better="high"
            />
            <MetricRow
              label="Judge-pick rate (final)"
              picks={picks}
              values={finals.map((f) => f.judgePickRate ?? 0)}
              fmt={(v) => (v ? `${Math.round(v * 100)}%` : "–")}
              better="high"
            />
          </div>
          <SectionNote>
            Judge-pick rate = how often the six judges ranked the team first in the
            finals it reached.
          </SectionNote>
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
          <ChartToolbar view={view} />
          <ChartFrame view={view}>
            <TeamLineChart
              rows={trend}
              teamIds={picks}
              height={300}
              yDomain={view.domain}
              yTickFmt={isPct ? (v) => `${Math.round(v * 100)}%` : isInt ? int : undefined}
              valueFmt={
                isPct
                  ? (v) => (v == null ? "–" : `${Math.round(v * 100)}%`)
                  : isInt
                    ? (v) => (v == null ? "–" : int(v))
                    : (v) => (v == null ? "–" : v.toFixed(1))
              }
              showLines={view.showLines}
            />
          </ChartFrame>
          <SectionNote>
            Lines break where a team had no match that series (only three of six
            teams dance each night).
          </SectionNote>
        </Panel>
      </div>
    </>
  );
}
