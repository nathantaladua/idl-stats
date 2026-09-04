import React, { useRef, useState } from "react";
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
const Z_MAX = 10;

/* --------------------------------------------------------- chart view state */

/**
 * Shared per-chart controls: a zoomable / pannable Y axis (so the lines and
 * shapes visibly grow and shrink as the value window tightens) plus a lines
 * on/off toggle. Points are always drawn. `values` is every plotted number,
 * used to seed the natural domain.
 */
export function useChartView(values, opts = {}) {
  const { pctScale = false, padFrac = 0.08 } = opts;
  const clean = values.filter((v) => v != null && !Number.isNaN(v));
  const lo = clean.length ? Math.min(...clean) : 0;
  const hi = clean.length ? Math.max(...clean) : 1;
  const pad = (hi - lo) * padFrac || (pctScale ? 0.04 : 1);
  const base = [lo - pad, hi + pad];

  const [z, setZ] = useState(1);
  const [panRaw, setPanRaw] = useState(0);
  const [showLines, setShowLines] = useState(true);

  const pan = Math.max(-1, Math.min(1, panRaw));
  const fullSpan = base[1] - base[0] || 1;
  const span = fullSpan / z;
  const mid = (base[0] + base[1]) / 2 + pan * (fullSpan - span) * 0.5;
  const domain = [mid - span / 2, mid + span / 2];
  const zoomed = z > 1.001;

  return {
    domain,
    pan,
    zoomed,
    showLines,
    setPan: (v) => setPanRaw(Math.max(-1, Math.min(1, v))),
    zoomIn: () => setZ((v) => Math.min(Z_MAX, v * 1.5)),
    zoomOut: () => setZ((v) => Math.max(1, v / 1.5)),
    panUp: () => setPanRaw((v) => Math.min(1, v + 0.3)),
    panDown: () => setPanRaw((v) => Math.max(-1, v - 0.3)),
    reset: () => {
      setZ(1);
      setPanRaw(0);
    },
    toggleLines: () => setShowLines((l) => !l),
  };
}

/** Toolbar rendered in a chart panel's header. `line` shows the lines toggle
 *  (bar / radar charts pass line={false}). */
export function ChartToolbar({ view, line = true }) {
  return (
    <div className="chartbar">
      <span className="chartbar__grp" role="group" aria-label="Y-axis zoom">
        <button onClick={view.zoomOut} disabled={!view.zoomed} aria-label="Zoom Y out">
          −
        </button>
        <button onClick={view.reset} disabled={!view.zoomed} aria-label="Reset Y axis">
          ⟳
        </button>
        <button onClick={view.zoomIn} aria-label="Zoom Y in">
          +
        </button>
        <button onClick={view.panUp} disabled={!view.zoomed} aria-label="Pan Y up">
          ↑
        </button>
        <button onClick={view.panDown} disabled={!view.zoomed} aria-label="Pan Y down">
          ↓
        </button>
      </span>
      {line && (
        <span className="chartbar__grp" role="group" aria-label="Series display">
          <button aria-pressed={view.showLines} onClick={view.toggleLines}>
            ╱ Lines
          </button>
        </span>
      )}
    </div>
  );
}

/** Wrapper that lets you drag vertically on the plot to pan the Y-axis window
 *  (only while zoomed). */
export function ChartFrame({ view, children }) {
  const box = useRef(null);
  const drag = useRef(null);

  const down = (e) => {
    if (!view.zoomed) return;
    drag.current = { y: e.clientY, pan: view.pan, h: box.current?.clientHeight || 320 };
    try {
      box.current.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const move = (e) => {
    if (!drag.current) return;
    const { y, pan, h } = drag.current;
    // drag down → pull the graph down → higher values slide in from the top
    view.setPan(pan + ((e.clientY - y) / h) * 2);
  };
  const up = (e) => {
    drag.current = null;
    try {
      box.current.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      ref={box}
      className={"chartframe" + (view.zoomed ? " is-grab" : "")}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------- marks */

// Square point marker. Bound to the team's own colour (NOT the line stroke) so
// the points stay visible even when the connecting line is toggled off.
function makeDot(c) {
  const Dot = ({ cx, cy }) =>
    cx == null || cy == null ? null : (
      <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={c} />
    );
  return <Dot />;
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

/* ------------------------------------------------------------------- charts */

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
  showLines = true,
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
            allowDataOverflow
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
              stroke={showLines ? color(id) : "transparent"}
              strokeWidth={showLines ? 2 : 0}
              dot={makeDot(color(id))}
              activeDot={{ r: 4, fill: color(id), stroke: "#09131d" }}
              connectNulls={connectNulls}
              isAnimationActive={false}
              label={
                showLines && teamIds.length > 1 && teamIds.length <= 3
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

/** Radar of the 10 judging criteria for up to three teams. */
export function CriteriaRadar({ series, labels, height = 340, domain = [7, 10] }) {
  const rows = labels.map((label, i) => {
    const row = { label };
    series.forEach((s) => (row[s.id] = s.values[i]));
    return row;
  });
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={rows} outerRadius="66%" margin={{ top: 26, bottom: 26, left: 10, right: 10 }}>
          <PolarGrid stroke={GRID} />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "#9aa4ac", fontSize: 10 }}
            tickSize={14}
          />
          <PolarRadiusAxis
            angle={90}
            domain={domain}
            allowDataOverflow
            tickFormatter={(v) => v.toFixed(1)}
            tick={{ fill: "#61707c", fontSize: 9 }}
            stroke={GRID}
          />
          <Tooltip content={<ChartTooltip fmt={(v) => (v == null ? "–" : v.toFixed(2))} />} />
          <Legend formatter={(v) => <span style={{ color: "#9aa4ac", fontSize: 11 }}>{v}</span>} />
          {series.map((s) => (
            <Radar
              key={s.id}
              name={teamName(s.id)}
              dataKey={s.id}
              stroke={color(s.id)}
              fill={color(s.id)}
              fillOpacity={series.length > 1 ? 0.12 : 0.28}
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
export function RankBar({ data: rows, valueFmt = (v) => v.toFixed(1), yTickFmt, height = 260, domain }) {
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
            allowDataOverflow
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
