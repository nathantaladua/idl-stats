import React from "react";
import { data, events, nf, int } from "../lib/data.js";
import { allSummaries, pointsProgression, judgeTendencies } from "../lib/stats.js";
import { TeamLineChart, Zoomable } from "../charts.jsx";
import { StatTile, Panel, TeamChip, FormStrip, SectionNote } from "../components.jsx";

export default function Overview({ go }) {
  const summaries = allSummaries().sort((a, b) => b.seasonPoints - a.seasonPoints);
  const prog = pointsProgression();
  const teamIds = summaries.map((s) => s.id);

  const nMatches = events.reduce((a, e) => a + e.matches.length, 0);
  const allJudgeTotals = events.flatMap((e) =>
    e.matches.flatMap((m) => m.judges.flatMap((j) => [j.totalA, j.totalB]))
  );
  const topScore = Math.max(...allJudgeTotals);
  const fanVotes = events.reduce(
    (a, e) => a + e.matches.reduce((x, m) => x + (m.fanVote.votesA || 0) + (m.fanVote.votesB || 0), 0),
    0
  );

  const judges = judgeTendencies();

  return (
    <>
      <div className="page-head">
        <h1>The 2026 season, by the numbers</h1>
        <p>
          Six pro teams, {events.length} completed series, {nMatches} head-to-head
          matches judged across ten criteria. Everything here is derived from the
          public scorecards on idl.pro.
        </p>
      </div>

      <div className="grid grid--tiles">
        <StatTile label="Pro teams" value={data.teams.length} />
        <StatTile label="Series completed" value={`${events.length} / 6`} />
        <StatTile label="Matches" value={nMatches} sub="3 per series" />
        <StatTile label="Judge scorecards" value={nMatches * 6} sub="6 judges / match" />
        <StatTile label="Fan votes cast" value={fanVotes.toLocaleString()} />
        <StatTile label="Top match score" value={nf(topScore, 1)} sub="out of 100" />
      </div>

      <div className="section">
        <h2>Season standings</h2>
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr>
                <th className="rank-cell">#</th>
                <th>Team</th>
                {events.map((e) => (
                  <th key={e.id}>{e.name.split(" ")[0]}</th>
                ))}
                <th>Total</th>
                <th>Match&nbsp;W–L</th>
                <th>Win&nbsp;%</th>
                <th>Form</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s, i) => (
                <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => go("teams", s.id)}>
                  <td className="rank-cell">{i + 1}</td>
                  <td>
                    <TeamChip id={s.id} />
                  </td>
                  {events.map((e) => (
                    <td key={e.id}>{s.perEventPoints[e.id] ?? "–"}</td>
                  ))}
                  <td className="num">{s.seasonPoints}</td>
                  <td>
                    {s.wins}–{s.losses}
                  </td>
                  <td className="num">{Math.round(s.winRate * 100)}%</td>
                  <td style={{ textAlign: "left" }}>
                    <FormStrip rows={s.rows} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <SectionNote>
            Series points: a team keeps its match-point tally (0–7, from six judges
            plus the fan vote); the three match winners also take a final-round
            placement bonus of 7 / 5 / 3. Row → team page.
          </SectionNote>
        </div>
      </div>

      <div className="section">
        <h2>Points race</h2>
        <Panel hint="cumulative series points after each series">
          <Zoomable>
            <TeamLineChart
              rows={prog}
              teamIds={teamIds}
              height={340}
              yDomain={[0, "auto"]}
              yTickFmt={int}
              valueFmt={(v) => `${int(v)} pts`}
            />
          </Zoomable>
        </Panel>
      </div>

      <div className="section">
        <h2>Judge tendencies</h2>
        <Panel hint="how the six-seat judging panel has scored, all series">
          <div style={{ overflowX: "auto" }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Judge</th>
                  <th>Series</th>
                  <th>Matches</th>
                  <th>Avg score given</th>
                  <th>Sided with winner</th>
                </tr>
              </thead>
              <tbody>
                {judges.map((j) => (
                  <tr key={j.name}>
                    <td>{j.name}</td>
                    <td className="num">{j.events}</td>
                    <td className="num">{j.matches}</td>
                    <td className="num">{nf(j.avgGiven, 1)}</td>
                    <td className="num">
                      {j.chalkRate == null ? "–" : `${Math.round(j.chalkRate * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SectionNote>
            "Avg score given" is the mean of every /100 total that judge handed out.
            "Sided with winner" is how often the team they scored higher went on to
            win the match.
          </SectionNote>
        </Panel>
      </div>
    </>
  );
}
