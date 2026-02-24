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
          <p className="axis-note">Golden window = 2–10 mo post vehicle; early &lt;2; dormant &gt;18.</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.timingFlagDistribution} margin={{ top: 12, right: 24, left: 24, bottom: 64 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="flag" angle={-20} textAnchor="end" label={{ value: "Timing flag", position: "insideBottom", offset: -8 }} />
              <YAxis tickFormatter={(v) => v.toLocaleString()} label={{ value: "Customers", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="customers" name="Customers" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Seasonal demand index (PL opens by month)</h3>
          <p className="axis-note">Index: 1.0 = average; &gt;1 = higher demand.</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.seasonalIndex} margin={{ top: 12, right: 24, left: 24, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthName" label={{ value: "Month", position: "insideBottom", offset: -8 }} />
              <YAxis domain={[0, "auto"]} label={{ value: "Index", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Line type="monotone" dataKey="index" name="Demand index" stroke="#7c3aed" dot={{ r: 4 }} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card full-width">
        <h3>Months since car loan (vehicle OPEN_DT)</h3>
        <p className="axis-note">Golden window for outreach: 2–10 months (shaded). Y-axis: number of customers.</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={monthsSinceTrim} margin={{ top: 16, right: 24, left: 56, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="months"
              label={{ value: "Months since vehicle OPEN_DT", position: "insideBottom", offset: -12 }}
            />
            <YAxis
              tickFormatter={(v) => v.toLocaleString()}
              label={{ value: "Customers", angle: -90, position: "insideLeft" }}
            />
            <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
            <ReferenceArea x1={2} x2={10} y1={0} y2={Math.max(...monthsSinceTrim.map((d) => d.customers), 1) || 1} fill="#22c55e33" strokeOpacity={0} />
            <Bar dataKey="customers" name="Customers" fill="#0d9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
