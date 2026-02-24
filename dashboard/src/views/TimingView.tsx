import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceArea,
} from "recharts";
import type { TimingData } from "../types";

interface Props {
  data: TimingData | null;
}

export function TimingView({ data }: Props) {
  if (!data) return <p>Loading timing…</p>;

  const monthsSinceTrim = data.monthsSinceCarLoan.filter((d) => d.months <= 36 && d.customers > 0);

  return (
    <section className="view timing-view">
      <h2>Timing intelligence (RUN 4)</h2>
      <p className="subtitle">Golden window (2–10 months), timing flags, months since car loan, seasonal demand index.</p>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Timing flag distribution</h3>
          <p className="axis-note">
            Timing flag summarises where the customer is on the timeline since vehicle loan: early (&lt;2 months), golden
            window (2–10), follow‑up window (10–18) or dormant (&gt;18).
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.timingFlagDistribution} margin={{ top: 12, right: 24, left: 24, bottom: 64 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="flag" angle={-20} textAnchor="end" />
              <YAxis tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="customers" name="Customers" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            A big golden‑window bar means many customers are currently in the sweet spot for PL outreach; a big dormant bar
            means the base may need re‑activation or cross‑sell strategies.
          </p>
        </div>

        <div className="chart-card">
          <h3>Seasonal demand index (PL opens by month)</h3>
          <p className="axis-note">Index: 1.0 = average; &gt;1 = higher demand.</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.seasonalIndex} margin={{ top: 12, right: 24, left: 24, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthName" />
              <YAxis domain={[0, "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="index" name="Demand index" stroke="#7c3aed" dot={{ r: 4 }} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            Peaks above 1.0 highlight calendar months where PL take‑up is stronger (festive season, tax time etc.); these
            months deserve more marketing budget.
          </p>
        </div>
      </div>

      <div className="chart-card full-width">
        <h3>Months since car loan (vehicle OPEN_DT)</h3>
        <p className="axis-note">
          Shows how many customers are at each age bucket since their vehicle loan. The green band (2–10 months) is the
          bureau‑adjusted golden window for outreach.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={monthsSinceTrim} margin={{ top: 16, right: 24, left: 56, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="months"
            />
            <YAxis tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
            <ReferenceArea x1={2} x2={10} y1={0} y2={Math.max(...monthsSinceTrim.map((d) => d.customers), 1) || 1} fill="#22c55e33" strokeOpacity={0} />
            <Bar dataKey="customers" name="Customers" fill="#0d9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="chart-comment">
          The height of the bars inside the shaded region tells you the size of the immediately serviceable PL pool; you can
          combine this with risk tiers to size near‑term campaign volumes.
        </p>
      </div>
    </section>
  );
}
