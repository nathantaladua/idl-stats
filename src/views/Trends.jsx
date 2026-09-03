import React, { useMemo, useState } from "react";
import { teams, color, teamName, CRITERIA_SHORT, int } from "../lib/data.js";
import { TREND_METRICS, metricByEvent, allSummaries } from "../lib/stats.js";
import { TeamLineChart, RankBar, useChartView, ChartToolbar } from "../charts.jsx";
import { Panel, SectionNote } from "../components.jsx";

export default function Trends() {
  const [metricKey, setMetricKey] = useState("points");
  const [on, setOn] = useState(() => new Set(teams.map((t) => t.id)));
  const metric = TREND_METRICS.find((m) => m.key === metricKey);

  const rows = useMemo(() => metricByEvent(metricKey), [metricKey]);
  const shown = teams.filter((t) => on.has(t.id)).map((t) => t.id);

  const toggle = (id) =>
    setOn((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n.size ? n : s;
    });

  const isPct = metric.pctScale;
  const isInt = metricKey === "points";
  const fmt = isPct
    ? (v) => (v == null ? "–" : `${Math.round(v * 100)}%`)
    : isInt
      ? (v) => (v == null ? "–" : int(v))
      : (v) => (v == null ? "–" : v.toFixed(1) + (metric.unit === "%" ? "%" : ""));
  const yTickFmt = isPct ? (v) => `${Math.round(v * 100)}%` : isInt ? int : undefined;

  const lineValues = rows.flatMap((r) => shown.map((id) => r[id]));
  const view = useChartView(lineValues, { pctScale: isPct });

  // season-aggregate ranking for the chosen metric
  const summaries = allSummaries();
  const aggKey = {
    points: "seasonPoints",
    avgScore: "avgScore",
    matchWinRate: "winRate",
    judgePointRate: "judgePointRate",
    fanShare: "avgFanShare",
    matchPointMargin: null,
  }[metricKey];
  const rank =
    aggKey &&
    summaries
      .map((s) => ({
        id: s.id,
        name: teamName(s.id).split(" ")[0],
        color: color(s.id),
        value: s[aggKey],
      }))
      .sort((a, b) => b.value - a.value);
  const rankView = useChartView(rank ? rank.map((r) => r.value) : [0, 1], {
    pctScale: isPct,
    padFrac: 0.02,
  });

  const critSeason = CRITERIA_SHORT.map((label, i) => {
    const row = { label };
    for (const s of summaries) row[s.id] = s.critByIdx[i];
    return row;
  });

  return (
    <>
      <div className="page-head">
        <h1>Trends</h1>
        <p>
          Track any metric series by series. Toggle teams to isolate a rivalry;
          use the toolbar to zoom the Y axis or hide the lines / points.
        </p>
      </div>

      <div className="controls">
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
        <div className="field">
          <span>Teams</span>
          <div className="pill-row">
            {teams.map((t) => (
              <button
                key={t.id}
                className="pill"
                aria-pressed={on.has(t.id)}
                style={on.has(t.id) ? { color: color(t.id) } : undefined}
                onClick={() => toggle(t.id)}
              >
                <span className="swatch" style={{ background: color(t.id) }} />
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Panel title={metric.label} hint={`by series · ${metric.unit}`}>
        <ChartToolbar view={view} />
        <TeamLineChart
          rows={rows}
          teamIds={shown}
          height={360}
          yDomain={view.domain}
          yTickFmt={yTickFmt}
          valueFmt={fmt}
          showDots={view.showDots}
          showLines={view.showLines}
        />
      </Panel>

      {rank && (
        <div className="section">
          <h2>Season to date</h2>
          <Panel hint={metric.label}>
            <ChartToolbar view={rankView} line={false} />
            <RankBar data={rank} domain={rankView.domain} valueFmt={fmt} yTickFmt={yTickFmt} />
          </Panel>
        </div>
      )}

      <div className="section">
        <h2>Where each team scores</h2>
        <Panel hint="season average score per criterion, /10">
          <div style={{ overflowX: "auto" }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Criterion</th>
                  {summaries.map((s) => (
                    <th key={s.id}>{teamName(s.id).split(" ")[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {critSeason.map((row) => {
                  const vals = summaries.map((s) => row[s.id]).filter((x) => x != null);
                  const hi = Math.max(...vals);
                  const lo = Math.min(...vals);
                  return (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      {summaries.map((s) => {
                        const v = row[s.id];
                        return (
                          <td
                            key={s.id}
                            className="num"
                            style={{
                              color:
                                v === hi ? color(s.id) : v === lo ? "var(--text-muted)" : undefined,
                            }}
                          >
                            {v == null ? "–" : v.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <SectionNote>Coloured = category leader · dim = category low.</SectionNote>
        </Panel>
      </div>
    </>
  );
}
