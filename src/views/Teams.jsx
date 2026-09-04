import React, { useState } from "react";
import { teams, team, events, color, nf, CRITERIA_SHORT, CRITERIA } from "../lib/data.js";
import { teamSummary, rosterNationalities, finalRoundSummary } from "../lib/stats.js";
import { CriteriaRadar } from "../charts.jsx";
import {
  StatTile,
  Panel,
  TeamChip,
  TeamLogo,
  FormStrip,
  SectionNote,
  ScopePicker,
} from "../components.jsx";

function TeamList({ go }) {
  const summaries = teams
    .map((t) => teamSummary(t.id))
    .sort((a, b) => b.seasonPoints - a.seasonPoints);
  return (
    <>
      <div className="page-head">
        <h1>Teams</h1>
        <p>Select a team for its full statistical profile.</p>
      </div>
      <div className="grid grid--2">
        {summaries.map((s) => (
          <button
            key={s.id}
            className="panel"
            style={{ textAlign: "left", borderLeft: `3px solid ${color(s.id)}` }}
            onClick={() => go("teams", s.id)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <TeamLogo id={s.id} small />
              <span className="tiny">
                #{s.seasonRank} · {s.seasonPoints} pts
              </span>
            </div>
            <div className="muted tiny" style={{ margin: "10px 0 12px" }}>
              {s.meta.city}
              {s.meta.country ? `, ${s.meta.country}` : ""} · est. {s.meta.founded || "—"} ·{" "}
              {s.meta.roster.length} dancers
            </div>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <div>
                <div className="tile__value" style={{ fontSize: "1.4rem" }}>
                  {s.wins}–{s.losses}
                </div>
                <div className="tiny">matches</div>
              </div>
              <div>
                <div className="tile__value" style={{ fontSize: "1.4rem" }}>
                  {nf(s.avgScore, 1)}
                </div>
                <div className="tiny">avg score</div>
              </div>
              <FormStrip rows={s.rows} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

export default function Teams({ param, go }) {
  const valid = param && team(param).name && teams.some((t) => t.id === param);
  return valid ? <TeamDetail param={param} go={go} /> : <TeamList go={go} />;
}

function TeamDetail({ param, go }) {
  const [scope, setScope] = useState({ series: "", round: "" });
  const s = teamSummary(param, scope);
  const seasonS = teamSummary(param);
  const fr = finalRoundSummary(param, scope);
  const nats = rosterNationalities(param);
  const meta = team(param);
  const captains = meta.roster.filter((d) => d.captain);
  const bestCrit = s.bestCritIdx >= 0 ? CRITERIA[s.bestCritIdx] : "–";
  const worstCrit = s.worstCritIdx >= 0 ? CRITERIA[s.worstCritIdx] : "–";
  const scoped = !!scope.series || !!scope.round;
  const scopeLabel = scoped
    ? [
        scope.series ? events.find((e) => e.id === scope.series)?.name || scope.series : "all series",
        scope.round === "1" ? "Round 1" : scope.round === "2" ? "Round 2" : "all rounds",
      ].join(" · ")
    : "whole season";

  return (
    <>
      <button className="pill" style={{ margin: "0 0 16px" }} onClick={() => go("teams")}>
        ← All teams
      </button>

      <section className="team-hero" style={{ borderLeft: `3px solid ${color(param)}` }}>
        <div className="team-hero__logo">
          <TeamLogo id={param} />
        </div>
        <div className="team-hero__body">
          {(meta.bio || []).length > 0 && (
            <p className="team-hero__bio">
              {((meta.bio.join(" ").match(/[^.!?]+[.!?]+/g) || meta.bio).slice(0, 3).join(" ")).trim()}
            </p>
          )}
          <ul className="team-hero__facts">
            <li>Founded {meta.founded || "—"}</li>
            <li>{meta.roster.length} dancers</li>
            <li>
              Currently #{seasonS.seasonRank} with {seasonS.seasonPoints} series points
            </li>
          </ul>
        </div>
      </section>

      <ScopePicker teamIds={[param]} scope={scope} onChange={setScope} />
      <p className="tiny" style={{ margin: "0 0 16px" }}>
        Stats below reflect: <b style={{ color: "var(--text-primary)" }}>{scopeLabel}</b>
        {s.played + s.finalRows.length === 0 && " — no data for this window"}
      </p>

      <div className="grid grid--tiles">
        <StatTile label="Matches W–L" value={`${s.wins}–${s.losses}`} sub={`${Math.round(s.winRate * 100)}% win rate`} accent={color(param)} />
        <StatTile label="Avg judge score" value={nf(s.avgScore, 1)} sub="out of 100" accent={color(param)} />
        <StatTile label="Judge-point rate" value={`${Math.round(s.judgePointRate * 100)}%`} sub={`${s.pointsFor}–${s.pointsAgainst} match pts`} accent={color(param)} />
        <StatTile label="Fan-vote win rate" value={`${Math.round(s.fanWinRate * 100)}%`} sub={`${nf(s.avgFanShare, 0)}% avg share`} accent={color(param)} />
        <StatTile label="Podiums" value={`${s.podiums[1]}·${s.podiums[2]}·${s.podiums[3]}`} sub="1st · 2nd · 3rd" accent={color(param)} />
        <StatTile
          label="Final round (rd 2)"
          value={`${fr.wins}/${fr.appearances}`}
          sub={fr.avgScore ? `${nf(fr.avgScore, 1)} avg score` : "no appearances"}
          accent={color(param)}
        />
        <StatTile label="Fan votes drawn" value={s.totalFanVotes.toLocaleString()} accent={color(param)} />
      </div>

      <div className="grid grid--2" style={{ marginTop: 14 }}>
        <Panel title="Criteria profile" hint={`avg /10 · ${scopeLabel}`}>
          <CriteriaRadar
            labels={CRITERIA_SHORT}
            series={[{ id: param, values: s.critByIdx }]}
            height={340}
            domain={[6, 10]}
          />
          {s.bestCritIdx >= 0 && (
            <SectionNote>
              Strongest: {bestCrit} ({nf(s.critByIdx[s.bestCritIdx], 2)}) · weakest: {worstCrit} (
              {nf(s.critByIdx[s.worstCritIdx], 2)}).
            </SectionNote>
          )}
        </Panel>

        <Panel title="Results" hint={scopeLabel}>
          <table className="data data--center">
            <thead>
              <tr>
                <th>Series</th>
                <th>Round</th>
                <th>Opponent</th>
                <th>Result</th>
                <th>Score</th>
                <th>Fan %</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r, i) => (
                <tr key={"m" + i}>
                  <td>{r.eventName.split(" ")[0]}</td>
                  <td className="muted">R1 · M{r.matchNo}</td>
                  <td>
                    <TeamChip id={r.opponent} />
                  </td>
                  <td className={r.won ? "win" : "loss"}>
                    {r.won ? "WON" : "LOST"} {r.ourPts}–{r.oppPts}
                  </td>
                  <td className="num">
                    {nf(r.ourAvg, 1)} <span className="muted">/ {nf(r.oppAvg, 1)}</span>
                  </td>
                  <td className="num">{r.fanPct == null ? "–" : `${r.fanPct}%`}</td>
                </tr>
              ))}
              {s.finalRows.map((r, i) => (
                <tr key={"f" + i}>
                  <td>{r.eventName.split(" ")[0]}</td>
                  <td className="muted">R2 · Final</td>
                  <td className="muted">vs 2 teams</td>
                  <td className={r.won ? "win" : "loss"}>
                    {r.rank === 1 ? "1st" : r.rank === 2 ? "2nd" : "3rd"}
                  </td>
                  <td className="num">{nf(r.avgTotal, 1)}</td>
                  <td className="num">{r.fanPct == null ? "–" : `${r.fanPct}%`}</td>
                </tr>
              ))}
              {s.rows.length + s.finalRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center" }}>
                    No performances in this window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="section">
        <h2>Roster composition</h2>
        <Panel hint={`${meta.roster.length} dancers · ${nats.length} nationalities`}>
          <div style={{ display: "flex", height: 14, marginBottom: 12 }}>
            {nats.map((n, i) => (
              <div
                key={n.code}
                title={`${n.code} · ${n.n}`}
                style={{
                  width: `${(n.n / s.meta.roster.length) * 100}%`,
                  background: `color-mix(in srgb, ${color(param)} ${100 - i * 12}%, #0d1a26)`,
                  borderRight: "2px solid var(--bg)",
                }}
              />
            ))}
          </div>
          <div className="pill-row">
            {nats.map((n) => (
              <span className="pill" key={n.code}>
                {n.code} <b style={{ color: "var(--text-primary)" }}>{n.n}</b>
              </span>
            ))}
          </div>
          {captains.length > 0 && (
            <SectionNote>
              Captains: {captains.map((c) => `${c.name}${c.number ? ` (#${c.number})` : ""}`).join(", ")}.
            </SectionNote>
          )}
        </Panel>
      </div>
    </>
  );
}
