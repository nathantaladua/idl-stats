import React, { useCallback, useRef, useState } from "react";
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
  LabelList,
} from "recharts";
import { color, teamName } from "./lib/data.js";
import { ChartTooltip } from "./components.jsx";

const AXIS = { stroke: "#33404d" };
const GRID = "#1c2732";

/**
 * Wraps a chart in a pan / zoom viewport. Zoom with the +/- buttons or
 * ⌘/Ctrl + scroll; drag to pan once zoomed; ⟳ resets.
 */
export function Zoomable({ children, min = 1, max = 6 }) {
  const [t, setT] = useState({ z: 1, x: 0, y: 0 });
  const box = useRef(null);
  const drag = useRef(null);
  const clampZ = (z) => Math.min(max, Math.max(min, z));

  const zoomAt = useCallback((factor, cx, cy) => {
    setT((s) => {
      const z = clampZ(s.z * factor);
      if (z === s.z) return s;
      const k = z / s.z;
      let x = cx - k * (cx - s.x);
      let y = cy - k * (cy - s.y);
      if (z <= min) {
        x = 0;
        y = 0;
      }
      return { z, x, y };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return; // leave normal page scroll alone
    e.preventDefault();
    const r = box.current.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top);
  };

  const onPointerDown = (e) => {
    if (t.z <= 1) return;
    drag.current = { px: e.clientX, py: e.clientY, x: t.x, y: t.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setT((s) => ({
      ...s,
      x: drag.current.x + (e.clientX - drag.current.px),
      y: drag.current.y + (e.clientY - drag.current.py),
    }));
  };
  const onPointerUp = (e) => {
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const btnZoom = (factor) => {
    const r = box.current.getBoundingClientRect();
    zoomAt(factor, r.width / 2, r.height / 2);
  };
  const reset = () => setT({ z: 1, x: 0, y: 0 });
  const zoomed = t.z > 1.001;

  return (
    <div
      className={"zoom" + (zoomed ? " is-zoomed" : "")}
      ref={box}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={reset}
    >
      <div className="zoom__ctl">
        <button type="button" onClick={() => btnZoom(1 / 1.4)} disabled={!zoomed} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={reset} disabled={!zoomed} aria-label="Reset zoom">
          ⟳
        </button>
        <button type="button" onClick={() => btnZoom(1.4)} disabled={t.z >= max} aria-label="Zoom in">
          +
        </button>
      </div>
      {zoomed && <div className="zoom__hint">drag to pan · dbl-click to reset</div>}
      <div
        className="zoom__view"
        style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.z})` }}
      >
        {children}
      </div>
    </div>
  );
}

function Dot({ cx, cy, stroke }) {
  if (cx == null || cy == null) return null;
  return <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={stroke} />;
}

// Direct label on the final point of a line — identity that doesn't rely on
// colour alone (the team colours are brand colours, not a CVD-tuned ramp).
function makeEndLabel(rows, id, abbr) {
  let last = -1;
  rows.forEach((r, i) => {
    if (r[id] != null) last = i;
  });
  return (props) => {
    if (props.index !== last) return null;
    return (
      <text
        x={props.x + 6}
        y={props.y}
        dy={4}
        fill={color(id)}
        fontSize={10}
        fontWeight={800}
        style={{ letterSpacing: "0.04em" }}
      >
        {abbr}
      </text>
    );
  };
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
        <LineChart data={rows} margin={{ top: 8, right: 52, bottom: 4, left: -8 }}>
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
              label={
                teamIds.length > 1 && teamIds.length <= 3
                  ? makeEndLabel(rows, id, teamName(id).split(" ")[0].slice(0, 9))
                  : undefined
              }
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

/** Bar ranking of teams by a single metric, with direct value labels. */
export function RankBar({
  data: rows,
  valueFmt = (v) => v.toFixed(1),
  yTickFmt,
  height = 260,
  domain,
}) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 20, right: 16, bottom: 4, left: -8 }}>
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
            tickFormatter={yTickFmt}
          />
          <Tooltip cursor={{ fill: "#12222f" }} content={<ChartTooltip fmt={valueFmt} />} />
          <Bar dataKey="value" name="Value" isAnimationActive={false}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={valueFmt}
              style={{ fill: "#c3c2b7", fontSize: 10, fontWeight: 700 }}
            />
            {rows.map((r) => (
              <Cell key={r.id} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
