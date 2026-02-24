import { useState, useEffect } from "react";
import type {
  OverviewData,
  PopulationData,
  BehaviourData,
  RiskData,
  TimingData,
  MonetisationData,
  OutreachData,
} from "./types";
import { Overview } from "./views/Overview";
import { PopulationView } from "./views/PopulationView";
import { BehaviourView } from "./views/BehaviourView";
import { RiskView } from "./views/RiskView";
import { TimingView } from "./views/TimingView";
import { MonetisationView } from "./views/MonetisationView";
import { OutreachView } from "./views/OutreachView";
import "./App.css";

type TabId =
  | "overview"
  | "population"
  | "behaviour"
  | "risk"
  | "timing"
  | "monetisation"
  | "outreach";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "population", label: "Population" },
  { id: "behaviour", label: "Behaviour" },
  { id: "risk", label: "Risk" },
  { id: "timing", label: "Timing" },
  { id: "monetisation", label: "Monetisation" },
  { id: "outreach", label: "Outreach" },
];

async function loadJson<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Failed to load ${path}`);
  return r.json() as Promise<T>;
}

export default function App() {
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [population, setPopulation] = useState<PopulationData | null>(null);
  const [behaviour, setBehaviour] = useState<BehaviourData | null>(null);
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [timing, setTiming] = useState<TimingData | null>(null);
  const [monetisation, setMonetisation] = useState<MonetisationData | null>(null);
  const [outreach, setOutreach] = useState<OutreachData | null>(null);

  useEffect(() => {
    // Use Vite base so it works on localhost (\"/\") and GitHub Pages (\"/scrub/\")
    const base = `${import.meta.env.BASE_URL}data`;
    Promise.all([
      loadJson<OverviewData>(`${base}/overview.json`),
      loadJson<PopulationData>(`${base}/population.json`),
      loadJson<BehaviourData>(`${base}/behaviour.json`),
      loadJson<RiskData>(`${base}/risk.json`),
      loadJson<TimingData>(`${base}/timing.json`),
      loadJson<MonetisationData>(`${base}/monetisation.json`),
      loadJson<OutreachData>(`${base}/outreach.json`),
    ])
      .then(([o, p, b, r, t, m, u]) => {
        setOverview(o);
        setPopulation(p);
        setBehaviour(b);
        setRisk(r);
        setTiming(t);
        setMonetisation(m);
        setOutreach(u);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <p>Loading dashboard data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error">
        <h1>Bureau Scrub Dashboard</h1>
        <p>Error: {error}</p>
        <p>Run <code>python3 scripts/compute_dashboard_data.py</code> from the project root to generate <code>dashboard/public/data/*.json</code>.</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bureau Scrub – Lending Dashboard</h1>
        <p className="app-subtitle">Population, behaviour, risk, timing &amp; monetisation (RUN 1–5).</p>
      </header>

      <nav className="tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={`tab ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === "overview" && <Overview data={overview} />}
        {tab === "population" && <PopulationView data={population} />}
        {tab === "behaviour" && <BehaviourView data={behaviour} />}
        {tab === "risk" && <RiskView data={risk} />}
        {tab === "timing" && <TimingView data={timing} />}
        {tab === "monetisation" && <MonetisationView data={monetisation} />}
        {tab === "outreach" && <OutreachView data={outreach} />}
      </main>
    </div>
  );
}
