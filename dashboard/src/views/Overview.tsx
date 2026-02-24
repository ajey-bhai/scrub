import type { OverviewData } from "../types";

interface Props {
  data: OverviewData | null;
}

export function Overview({ data }: Props) {
  if (!data) return <p>Loading overview…</p>;

  const cards = [
    { label: "Total customers (N0)", value: data.totalCustomers.toLocaleString() },
    { label: "Serviceable base (SAM)", value: data.serviceableBase.toLocaleString() },
    { label: "Avg tradelines / customer", value: data.avgTradelinesPerCustomer.toFixed(2) },
    { label: "PL penetration rate", value: `${data.plPenetrationRate}%` },
    { label: "In golden window now (2–10 mo)", value: data.customersInGoldenWindowNow.toLocaleString() },
    { label: "Bureau date", value: data.bureauDate },
  ];

  return (
    <section className="view overview-view">
      <h2>Overview</h2>
      <p className="subtitle">Key metrics from bureau scrub (RUN 1–4).</p>
      <div className="kpi-grid">
        {cards.map((c) => (
          <div key={c.label} className="kpi-card">
            <div className="kpi-value">{c.value}</div>
            <div className="kpi-label">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="golden-window-note">
        <strong>Golden window (Curve A / B):</strong> {data.goldenWindowCurveA.toLocaleString()} customers took PL in 2–10 months post vehicle (all); {data.goldenWindowCurveB.toLocaleString()} first-timers only.
      </div>
    </section>
  );
}
