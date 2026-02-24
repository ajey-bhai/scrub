import type { OverviewData, DataQualityData } from "../types";

interface Props {
  data: OverviewData | null;
  dataQuality: DataQualityData | null;
}

export function Overview({ data, dataQuality }: Props) {
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
      <p className="subtitle">
        High‑level picture of how many customers you have, how many look usable for lending, and how many sit in the key PL
        demand window right now.
      </p>
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
        {" "}
        This window is where recall of the car purchase is high and PL need is visible, so campaigns here generally convert
        best.
      </div>
      {dataQuality && (
        <div className="chart-card" style={{ marginTop: "1.25rem" }}>
          <h3>Data quality summary (how much to trust the charts)</h3>
          <p className="axis-note">
            Quick health check on the bureau scrub before reading any detail: anchors, demand-curve spike tests, bureau
            freshness and repayment vs bucket consistency.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.4rem", borderBottom: "1px solid #334155" }}>Metric</th>
                <th style={{ textAlign: "left", padding: "0.4rem", borderBottom: "1px solid #334155" }}>Value</th>
                <th style={{ textAlign: "left", padding: "0.4rem", borderBottom: "1px solid #334155" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {dataQuality.table.map((row) => (
                <tr key={row.metric}>
                  <td style={{ padding: "0.35rem 0.4rem" }}>{row.metric}</td>
                  <td style={{ padding: "0.35rem 0.4rem" }}>{row.value}</td>
                  <td style={{ padding: "0.35rem 0.4rem" }}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
