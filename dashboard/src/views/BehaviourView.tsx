import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import type { BehaviourData } from "../types";

interface Props {
  data: BehaviourData | null;
}

export function BehaviourView({ data }: Props) {
  if (!data) return <p>Loading behaviour…</p>;

  // Trim long tail and merge for dual-line chart
  const maxMonths = 24;
  const byMonth: Record<number, { months: number; curveA: number; curveB: number }> = {};
  for (let m = 0; m <= maxMonths; m++) {
    byMonth[m] = { months: m, curveA: 0, curveB: 0 };
  }
  data.timeToNextPLCurveA.forEach((d) => {
    if (d.months <= maxMonths) byMonth[d.months].curveA = d.count;
  });
  data.timeToNextPLCurveB.forEach((d) => {
    if (d.months <= maxMonths) byMonth[d.months].curveB = d.count;
  });
  const mergedCurve = Object.values(byMonth);

  return (
    <section className="view behaviour-view">
      <h2>Behaviour & time-to-next-PL (RUN 2)</h2>
      <p className="subtitle">Curve A (all) vs Curve B (first-timers). Repayment quality and credit velocity.</p>

      <div className="chart-card full-width">
        <h3>Time to next PL (months from vehicle OPEN_DT)</h3>
        <p className="axis-note">
          Each point shows how many customers took their first PL after the car loan in that month bucket. We work in whole
          months and mentally add about 1.5 months for bureau reporting lag.
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={mergedCurve} margin={{ top: 16, right: 24, left: 56, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="months"
            />
            <YAxis tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
            <Legend />
            <Line type="monotone" dataKey="curveA" name="Curve A (all customers)" stroke="#2563eb" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="curveB" name="Curve B (first-timers)" stroke="#ea580c" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <p className="chart-comment">
          Most PLs arrive in the first few months after the car purchase, and the curve then slowly tapers off. This tells us
          that the highest‑conversion window is soon after disbursal rather than years later.
        </p>
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Repayment quality score (% on-time)</h3>
          <p className="axis-note">
            Repayment quality = share of months in `PAYMENT_HISTORY_GRID` where the code is 0 (on‑time). Higher buckets mean
            more months paid on time.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.repaymentQualityDistribution} margin={{ top: 12, right: 24, left: 24, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <ReferenceLine y={0} stroke="#666" />
              <Bar dataKey="customers" name="Customers" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            If most customers cluster in the 80–100% buckets, it means the base habitually pays on time and we can be more
            confident offering PL without heavy pricing penalties.
          </p>
        </div>

        <div className="chart-card">
          <h3>Credit velocity (accounts opened in last 12m)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.creditVelocity} margin={{ top: 12, right: 24, left: 24, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="segment" />
              <YAxis tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="customers" name="Customers" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            A high share in the “2+ accounts in last 12 months” bar points to more aggressive credit seekers, where we should
            be cautious on ticket and pricing despite apparent demand.
          </p>
        </div>
      </div>
    </section>
  );
}
