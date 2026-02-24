import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { PopulationData } from "../types";

const LENDER_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"];
const MIX_COLORS = ["#0ea5e9", "#84cc16", "#64748b"];

interface Props {
  data: PopulationData | null;
}

export function PopulationView({ data }: Props) {
  if (!data) return <p>Loading population…</p>;

  const bucketTotal = data.bucketDistribution.reduce((s, b) => s + b.customers, 0);

  return (
    <section className="view population-view">
      <h2>Population & product mix (RUN 1)</h2>
      <p className="subtitle">Deduplicated base, buckets, lender type, product mix.</p>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Bucket distribution (A/B/C/D)</h3>
          <p className="axis-note">Customers by risk/status bucket. Total: {bucketTotal.toLocaleString()}.</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data.bucketDistribution}
              layout="vertical"
              margin={{ top: 12, right: 24, left: 100, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} label={{ value: "Number of customers", position: "insideBottom", offset: -16 }} />
              <YAxis dataKey="bucket" type="category" width={90} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} labelFormatter={(_, payload) => payload?.[0]?.payload?.bucket} />
              <Bar dataKey="customers" name="Customers" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Lender type (NBF / PVT / PUB / Mixed)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data.lenderTypeDistribution}
              margin={{ top: 12, right: 24, left: 24, bottom: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="lenderType" label={{ value: "Lender type", position: "insideBottom", offset: -8 }} />
              <YAxis tickFormatter={(v) => v.toLocaleString()} label={{ value: "Customers", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="customers" name="Customers">
                {data.lenderTypeDistribution.map((_, i) => (
                  <Cell key={i} fill={LENDER_COLORS[i % LENDER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Product mix</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
              <Pie
                data={data.productMix}
                dataKey="customers"
                nameKey="mix"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(props: { name?: string; value?: number }) => `${props.name ?? ""}: ${(props.value ?? 0).toLocaleString()}`}
              >
                {data.productMix.map((_, i) => (
                  <Cell key={i} fill={MIX_COLORS[i % MIX_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Account type (top tradelines)</h3>
          <p className="axis-note">ACCT_TYPE_CD by tradeline count.</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data.acctTypeDistribution.slice(0, 10)}
              margin={{ top: 12, right: 24, left: 24, bottom: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="acctType" label={{ value: "Account type code", position: "insideBottom", offset: -8 }} />
              <YAxis tickFormatter={(v) => v.toLocaleString()} label={{ value: "Tradelines", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="tradelines" name="Tradelines" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
