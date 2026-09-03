import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { color, teamName } from "./lib/data.js";
import { ChartTooltip } from "./components.jsx";

const AXIS = { stroke: "#33404d" };
const GRID = "#1c2732";

function Dot({ cx, cy, stroke }) {
  if (cx == null || cy == null) return null;
  return <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={stroke} />;
}

/** Multi-team line chart over the season's events. */
export function TeamLineChart({
  rows,
  teamIds,
  height = 300,
  yDomain,
  yTickFmt = (v) => v,
  valueFmt = (v) => (v == null ? "–" : v.toFixed(1)),
  labelName = "Series",
  connectNulls = true,
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="event"
            tickLine={false}
            axisLine={AXIS}
            tick={{ fill: "#61707c", fontSize: 11 }}
          />
          <YAxis
            domain={yDomain || ["auto", "auto"]}
            tickLine={false}
            axisLine={AXIS}
            width={54}
            tick={{ fill: "#61707c", fontSize: 11 }}
            tickFormatter={yTickFmt}
          />
          <Tooltip
            content={<ChartTooltip fmt={valueFmt} labelName={labelName} />}
            cursor={{ stroke: "#33404d" }}
          />
          <Legend
            verticalAlign="bottom"
            height={30}
            formatter={(v) => <span style={{ color: "#9aa4ac", fontSize: 11 }}>{v}</span>}
          />
          {teamIds.map((id) => (
            <Line
              key={id}
              type="linear"
              dataKey={id}
              name={teamName(id)}
              stroke={color(id)}
              strokeWidth={2}
              dot={<Dot />}
              activeDot={{ r: 4, fill: color(id), stroke: "#09131d" }}
              connectNulls={connectNulls}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Radar of the 10 judging criteria for one or two teams. */
export function CriteriaRadar({ series, labels, height = 340, domain = [7, 10] }) {
  const rows = labels.map((label, i) => {
    const row = { label };
    series.forEach((s) => (row[s.id] = s.values[i]));
    return row;
  });
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke={GRID} />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "#9aa4ac", fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={domain}
            tick={{ fill: "#61707c", fontSize: 9 }}
            stroke={GRID}
          />
          <Tooltip
            content={<ChartTooltip fmt={(v) => (v == null ? "–" : v.toFixed(2))} />}
          />
          <Legend
            formatter={(v) => <span style={{ color: "#9aa4ac", fontSize: 11 }}>{v}</span>}
          />
          {series.map((s) => (
            <Radar
              key={s.id}
              name={teamName(s.id)}
              dataKey={s.id}
              stroke={color(s.id)}
              fill={color(s.id)}
              fillOpacity={series.length > 1 ? 0.15 : 0.28}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal-ish bar ranking teams by a single metric. */
export function RankBar({ data: rows, valueFmt = (v) => v.toFixed(1), height = 260, domain }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 6, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={AXIS}
            tick={{ fill: "#9aa4ac", fontSize: 10 }}
            interval={0}
          />
          <YAxis
            domain={domain || [0, "auto"]}
            tickLine={false}
            axisLine={AXIS}
            width={48}
            tick={{ fill: "#61707c", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "#12222f" }}
            content={<ChartTooltip fmt={valueFmt} />}
          />
          <Bar dataKey="value" name="Value" isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.id} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
