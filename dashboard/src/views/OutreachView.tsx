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
      <p className="subtitle">Cohorts by composite priority: immediate, 30d, 90d, hold.</p>

      <div className="chart-card" style={{ maxWidth: 640 }}>
        <h3>Outreach cohort distribution</h3>
        <p className="axis-note">Rank by priority_score; top 20% = immediate, then 30d, 90d, hold.</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.outreachCohortDistribution} margin={{ top: 12, right: 24, left: 24, bottom: 64 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="cohort"
              angle={-20}
              textAnchor="end"
              label={{ value: "Cohort", position: "insideBottom", offset: -8 }}
            />
            <YAxis
              tickFormatter={(v) => v.toLocaleString()}
              label={{ value: "Customers", angle: -90, position: "insideLeft" }}
            />
            <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
            <Bar dataKey="customers" name="Customers">
              {data.outreachCohortDistribution.map((_, i) => (
                <Cell key={i} fill={COHORT_COLORS[i % COHORT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
