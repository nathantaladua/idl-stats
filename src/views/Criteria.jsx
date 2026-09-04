import React from "react";
import { CRITERIA_INFO, color, teamName, abbr, nf } from "../lib/data.js";
import { criterionRanking, criterionByEvent } from "../lib/stats.js";
import { RankBar, TeamLineChart } from "../charts.jsx";
import { Panel, TeamChip, SectionNote } from "../components.jsx";

export default function Criteria({ param, go }) {
  const idx = Math.max(
    0,
    CRITERIA_INFO.findIndex((c) => c.slug === param)
  );
  const info = CRITERIA_INFO[idx];
  const ranking = criterionRanking(idx);
  const byEvent = criterionByEvent(idx);
  const teamIds = ranking.map((r) => r.id);

  const bars = ranking.map((r) => ({
    id: r.id,
    name: abbr(r.id),
    color: color(r.id),
    value: r.avg,
  }));

  return (
    <>
      <div className="page-head">
        <h1>Criteria</h1>
        <p>
          Every routine is judged out of 10 on each of these ten criteria. Pick one
          to see how the teams rank on it.
        </p>
      </div>

      <div className="controls">
        <div className="pill-row">
          {CRITERIA_INFO.map((c, i) => (
            <button
              key={c.slug}
              className="pill"
              aria-pressed={i === idx}
              onClick={() => go("criteria", c.slug)}
            >
              {c.short}
            </button>
          ))}
        </div>
      </div>

      <Panel title={info.name} hint="/ 10">
        <p className="muted" style={{ margin: "0 0 4px", maxWidth: "70ch" }}>
          {info.desc}
        </p>
      </Panel>

      <div className="section">
        <h2>Season ranking</h2>
        <Panel hint="average score on this criterion, matches + final rounds">
          <RankBar data={bars} domain={[6, 10]} valueFmt={(v) => nf(v, 2)} />
        </Panel>
      </div>

      <div className="section">
        <h2>By series</h2>
        <Panel hint={`${info.short} · /10`}>
          <TeamLineChart
            rows={byEvent}
            teamIds={teamIds}
            height={320}
            yDomain={[6, 10]}
            valueFmt={(v) => (v == null ? "–" : v.toFixed(2))}
          />
        </Panel>
      </div>

      <div className="section">
        <h2>Detail</h2>
        <Panel>
          <div style={{ overflowX: "auto" }}>
            <table className="data">
              <thead>
                <tr>
                  <th className="rank-cell">#</th>
                  <th className="tcell">Team</th>
                  <th>Season avg</th>
                  <th>Perf.</th>
                  <th>Best single</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.id}>
                    <td className="rank-cell">{i + 1}</td>
                    <td className="tcell">
                      <TeamChip id={r.id} />
                    </td>
                    <td className="num" style={{ color: color(r.id) }}>
                      {nf(r.avg, 2)}
                    </td>
                    <td className="num">{r.n}</td>
                    <td className="num">
                      {r.best ? `${nf(r.best.value, 1)}` : "–"}
                      {r.best && <span className="muted"> · {r.best.label}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SectionNote>"Perf." = number of judged performances that fed this average.</SectionNote>
        </Panel>
      </div>
    </>
  );
}
