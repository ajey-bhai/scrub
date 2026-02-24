import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import type { OutreachData } from "../types";

const COHORT_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#94a3b8"];

interface Props {
  data: OutreachData | null;
}

export function OutreachView({ data }: Props) {
  if (!data) return <p>Loading outreach…</p>;

  return (
    <section className="view outreach-view">
      <h2>Outreach prioritisation</h2>
      <p className="subtitle">
        Simple cohorts that say who to call now, next 30 days, next 90 days, and who to park for later based on risk and
        timing.
      </p>

      <div className="chart-card" style={{ maxWidth: 640 }}>
        <h3>Outreach cohort distribution</h3>
        <p className="axis-note">
          We rank customers by a simple priority score (higher = better combination of low risk and good timing) and split
          them into: Immediate (&approx;top 20%), 30‑day follow‑up, 90‑day follow‑up, and Hold.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.outreachCohortDistribution} margin={{ top: 12, right: 24, left: 24, bottom: 64 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="cohort"
              angle={-20}
              textAnchor="end"
            />
            <YAxis tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
            <Bar dataKey="customers" name="Customers">
              {data.outreachCohortDistribution.map((_, i) => (
                <Cell key={i} fill={COHORT_COLORS[i % COHORT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="chart-comment">
          This split helps sales and CRM teams focus on the best customers first while still keeping a clear pipeline of who
          to talk to in the next 1–3 months.
        </p>
      </div>
    </section>
  );
}
