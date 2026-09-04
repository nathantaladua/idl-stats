import React from "react";
import { data, events, nf, int } from "../lib/data.js";
import { allSummaries, pointsProgression, judgeTendencies } from "../lib/stats.js";
import { TeamLineChart, useChartView, ChartToolbar, ChartFrame } from "../charts.jsx";
import { Panel, TeamChip, FormStrip, SectionNote } from "../components.jsx";

export default function Overview({ go }) {
  const summaries = allSummaries().sort((a, b) => b.seasonPoints - a.seasonPoints);
  const prog = pointsProgression();
  const teamIds = summaries.map((s) => s.id);
  const nMatches = events.reduce((a, e) => a + e.matches.length, 0);
  const judges = judgeTendencies();

  const progValues = prog.flatMap((r) => teamIds.map((id) => r[id]));
  const view = useChartView(progValues);

  return (
    <>
      <section className="hero">
        <a
          className="hero__logo"
          href="https://www.idl.pro"
          target="_blank"
          rel="noreferrer"
          aria-label="International Dance League — idl.pro"
        >
          <img src="assets/idl-hero.png" alt="IDL" />
        </a>
        <div className="hero__body">
          <p className="hero__kicker">Unofficial statistics · 2026 season</p>
          <h1>
            Every score, every
            <br />
            match, one place.
          </h1>
          <p className="hero__lede">
            Six pro teams. {events.length} of 6 series danced. {nMatches} head-to-head
            matches judged across ten criteria, plus every final round. All of it
            scraped straight from the public scorecards on{" "}
            <a href="https://www.idl.pro" target="_blank" rel="noreferrer">
              idl.pro
            </a>
            .
          </p>
        </div>
      </section>

      <div className="section">
        <h2>Season standings</h2>
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr>
                <th className="rank-cell">#</th>
                <th className="tcell">Team</th>
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
                  <td className="tcell">
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
          <ChartToolbar view={view} />
          <ChartFrame view={view}>
            <TeamLineChart
              rows={prog}
              teamIds={teamIds}
              height={340}
              yDomain={view.domain}
              yTickFmt={int}
              valueFmt={(v) => `${int(v)} pts`}
              showLines={view.showLines}
            />
          </ChartFrame>
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
                  <th>Rounds</th>
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
            Across matches and final rounds. "Avg score given" is the mean of every
            /100 total that judge handed out. "Sided with winner" is how often the
            team they scored highest went on to win.
          </SectionNote>
        </Panel>
      </div>
    </>
  );
}
