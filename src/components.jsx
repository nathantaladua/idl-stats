import React, { useState } from "react";
import { color, teamName, logo, mark } from "./lib/data.js";

/** Small square team mark — the file at assets/marks/<id>.* if present,
 *  otherwise the plain colour swatch. */
export function TeamMark({ id, size = 12 }) {
  const src = mark(id);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className="swatch"
        style={{ "--c": color(id), background: color(id), width: size, height: size }}
      />
    );
  }
  return (
    <img
      className="team-mark"
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function TeamChip({ id, large, name }) {
  return (
    <span className={"team-chip" + (large ? " team-chip--lg" : "")}>
      <TeamMark id={id} size={large ? 20 : 12} />
      {name || teamName(id)}
    </span>
  );
}

/** The team's own logo lockup scraped from idl.pro (falls back to a chip). */
export function TeamLogo({ id, small }) {
  const src = logo(id);
  if (!src) return <TeamChip id={id} large={!small} />;
  return (
    <img
      className={"team-logo" + (small ? " team-logo--sm" : "")}
      src={src}
      alt={teamName(id)}
      loading="lazy"
    />
  );
}

export function StatTile({ label, value, sub, accent }) {
  return (
    <div className="tile" style={accent ? { borderLeftColor: accent } : undefined}>
      <div className="tile__label">{label}</div>
      <div className="tile__value">{value}</div>
      {sub != null && <div className="tile__sub">{sub}</div>}
    </div>
  );
}

export function Panel({ title, hint, children, style }) {
  return (
    <div className="panel" style={style}>
      {(title || hint) && (
        <div className="panel__title">
          {title && <h2>{title}</h2>}
          {hint && <span className="hint">{hint}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Recharts tooltip themed to the site. `fmt` formats a numeric value. */
export function ChartTooltip({ active, payload, label, fmt = (v) => v, labelName }) {
  if (!active || !payload || !payload.length) return null;
  const rows = payload
    .filter((p) => p.value != null)
    .sort((a, b) => b.value - a.value);
  return (
    <div className="tooltip">
      <div className="tooltip__head">{labelName ? `${labelName}: ${label}` : label}</div>
      {rows.map((p) => (
        <div className="tooltip__row" key={p.dataKey || p.name}>
          <span className="k">
            <span className="swatch" style={{ background: p.color || p.stroke || p.fill }} />
            {p.name}
          </span>
          <span className="v">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Small W / L / D chip strip for a team's match sequence. */
export function FormStrip({ rows }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {rows.map((r, i) => (
        <span
          key={i}
          title={`${r.eventName} · Match ${r.matchNo} vs ${teamName(r.opponent)} — ${r.ourPts}-${r.oppPts}`}
          style={{
            width: 16,
            height: 16,
            display: "grid",
            placeItems: "center",
            fontSize: 10,
            fontWeight: 800,
            color: r.won ? "#fff" : "var(--text-secondary)",
            background: r.won ? "var(--win)" : "var(--surface-2)",
            border: "1px solid var(--line-strong)",
          }}
        >
          {r.won ? "W" : r.drawn ? "D" : "L"}
        </span>
      ))}
    </span>
  );
}

export function SectionNote({ children }) {
  return <p className="tiny" style={{ margin: "10px 0 0" }}>{children}</p>;
}
