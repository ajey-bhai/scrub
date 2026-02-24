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
      <p className="subtitle">
        Simple, rule‑based view of how safe each customer looks (risk) and how much loan size they seem comfortable with
        (affordability), based only on bureau behaviour.
      </p>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Risk tier distribution</h3>
          <p className="axis-note">
            Risk score is a rough 0–100 index built from DPD history, write‑offs and repayment quality. 70–100 = we treat as
            safe for unsecured PL; 40–69 = better for Loan Against Car; 0–39 = avoid for unsecured.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.riskTierDistribution} margin={{ top: 12, right: 24, left: 24, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="customers" name="Customers">
                {data.riskTierDistribution.map((_, i) => (
                  <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            The fact that most customers land in the 70–100 band means a large share of this base is statistically clean and
            can safely be targeted with unsecured cash PL offers.
          </p>
        </div>

        <div className="chart-card">
          <h3>Affordability tier (max credit / loan ever)</h3>
          <p className="axis-note">
            Affordability tier is derived from the highest credit limit or original loan amount ever seen for the customer:
            Micro &lt;₹50K; Mid ₹50K–₹2L; Mass ₹2L–₹10L; Affluent ₹10L+.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.affordabilityDistribution} margin={{ top: 12, right: 24, left: 24, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="customers" name="Customers">
                {data.affordabilityDistribution.map((_, i) => (
                  <Cell key={i} fill={AFFORDABILITY_COLORS[i % AFFORDABILITY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            A strong presence in the mid and mass bands suggests that ticket sizes between ₹50K and ₹10L are familiar and
            acceptable to the base; PL pricing and product design can be centred there.
          </p>
        </div>
      </div>
    </section>
  );
}
