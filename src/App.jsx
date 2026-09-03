import React, { useEffect, useState } from "react";
import { data } from "./lib/data.js";
import Overview from "./views/Overview.jsx";
import Trends from "./views/Trends.jsx";
import Compare from "./views/Compare.jsx";
import Teams from "./views/Teams.jsx";
import Matches from "./views/Matches.jsx";

const TABS = [
  { id: "overview", label: "Overview", view: Overview },
  { id: "trends", label: "Trends", view: Trends },
  { id: "compare", label: "Compare", view: Compare },
  { id: "teams", label: "Teams", view: Teams },
  { id: "matches", label: "Matches", view: Matches },
];

function useHashRoute() {
  const parse = () => {
    const h = window.location.hash.replace(/^#\/?/, "");
    const [tab, ...rest] = h.split("/");
    return { tab: TABS.some((t) => t.id === tab) ? tab : "overview", param: rest.join("/") };
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = (tab, param) => {
    window.location.hash = "/" + tab + (param ? "/" + param : "");
  };
  return [route, go];
}

export default function App() {
  const [route, go] = useHashRoute();
  const Active = (TABS.find((t) => t.id === route.tab) || TABS[0]).view;
  const scrapedAt = new Date(data.meta.scrapedAt);

  return (
    <div className="app">
      <header className="masthead">
        <div className="wrap masthead__row">
          <a
            className="brand"
            href="#/overview"
            onClick={(e) => {
              e.preventDefault();
              go("overview");
            }}
          >
            <img className="brand__logo" src="assets/idl-hero.png" alt="IDL" />
            <span className="brand__name">STATS</span>
            <span className="brand__sub">2026 · UNOFFICIAL</span>
          </a>
          <nav className="nav">
            {TABS.map((t) => (
              <button
                key={t.id}
                aria-current={route.tab === t.id}
                onClick={() => go(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <div className="wrap">
          <Active param={route.param} go={go} />
        </div>
      </main>

      <footer className="footer">
        <div className="wrap">
          Unofficial fan project. All statistics scraped from{" "}
          <a href="https://www.idl.pro" target="_blank" rel="noreferrer">
            idl.pro
          </a>{" "}
          on{" "}
          {scrapedAt.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          . Not affiliated with the International Dance League. Through Series{" "}
          {Math.max(...data.events.map((e) => e.series))} of 6.
        </div>
      </footer>
    </div>
  );
}
