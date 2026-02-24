import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { RiskData } from "../types";

const TIER_COLORS = ["#ef4444", "#f59e0b", "#22c55e"];
const AFFORDABILITY_COLORS = ["#94a3b8", "#38bdf8", "#a78bfa", "#f472b6"];

interface Props {
  data: RiskData | null;
}

export function RiskView({ data }: Props) {
  if (!data) return <p>Loading risk…</p>;

  return (
    <section className="view risk-view">
      <h2>Risk & affordability (RUN 3)</h2>
      <p className="subtitle">Composite risk tiers (0–39 exclude, 40–69 LAC, 70–100 PL eligible) and affordability proxy.</p>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Risk tier distribution</h3>
          <p className="axis-note">70–100: PL eligible; 40–69: LAC eligible; 0–39: Exclude.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.riskTierDistribution} margin={{ top: 12, right: 24, left: 24, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" label={{ value: "Risk score tier", position: "insideBottom", offset: -8 }} />
              <YAxis tickFormatter={(v) => v.toLocaleString()} label={{ value: "Customers", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="customers" name="Customers">
                {data.riskTierDistribution.map((_, i) => (
                  <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Affordability tier (max credit / loan ever)</h3>
          <p className="axis-note">Micro &lt;₹50K; Mid ₹50K–₹2L; Mass ₹2L–₹10L; Affluent ₹10L+.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.affordabilityDistribution} margin={{ top: 12, right: 24, left: 24, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" label={{ value: "Affordability tier", position: "insideBottom", offset: -8 }} />
              <YAxis tickFormatter={(v) => v.toLocaleString()} label={{ value: "Customers", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="customers" name="Customers">
                {data.affordabilityDistribution.map((_, i) => (
                  <Cell key={i} fill={AFFORDABILITY_COLORS[i % AFFORDABILITY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
