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

  return (
    <section className="view population-view">
      <h2>Population & product mix (RUN 1)</h2>
      <p className="subtitle">Deduplicated base, buckets, lender type, product mix.</p>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Bucket distribution (A/B/C/D)</h3>
          <p className="axis-note">
            Customers grouped by overall health of their credit history. Bucket A = currently clean and active, Bucket D =
            serious issues like write-offs.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data.bucketDistribution}
              layout="vertical"
              margin={{ top: 12, right: 24, left: 100, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
              <YAxis dataKey="bucket" type="category" width={90} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} labelFormatter={(_, payload) => payload?.[0]?.payload?.bucket} />
              <Bar dataKey="customers" name="Customers" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            Most customers sit in Bucket B (closed but clean history), which is a strong pool for re‑activation offers since
            they have shown they can finish loans without major trouble.
          </p>
        </div>

        <div className="chart-card">
          <h3>Lender type (NBF / PVT / PUB / Mixed)</h3>
          <p className="axis-note">
            Lender type is based on {`M_SUB_ID`}: NBF = NBFC, PVT = private bank, PUB = public sector bank, Mixed = more than
            one type.
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={data.lenderTypeDistribution}
              margin={{ top: 12, right: 24, left: 24, bottom: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="lenderType" />
              <YAxis tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="customers" name="Customers">
                {data.lenderTypeDistribution.map((_, i) => (
                  <Cell key={i} fill={LENDER_COLORS[i % LENDER_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            The large Mixed bar means most customers have borrowed from more than one lender type, so their behaviour is not
            tied to a single institution and they are open to offers from new lenders.
          </p>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <h3>Product mix</h3>
          <p className="axis-note">
            Product mix looks at whether a customer only has a car loan, both car loan and PL, or only other products in the
            bureau.
          </p>
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
          <p className="chart-comment">
            Customers with both vehicle and PL history (vehicle_and_pl) have already proven PL appetite; they are the best
            starting point for higher‑ticket repeat loans.
          </p>
        </div>

        <div className="chart-card">
          <h3>Account type (top tradelines)</h3>
          <p className="axis-note">
            Each bar is a bureau product code (`ACCT_TYPE_CD`) showing how many tradelines of that type exist in this file.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data.acctTypeDistribution.slice(0, 10)}
              margin={{ top: 12, right: 24, left: 24, bottom: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="acctType" />
              <YAxis tickFormatter={(v) => v.toLocaleString()} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
              <Bar dataKey="tradelines" name="Tradelines" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            Here you can see which bureau product codes dominate the portfolio. High counts on PL codes confirm a strong cash
            lending base, while high vehicle codes confirm a deep collateral base for Loan Against Car.
          </p>
        </div>
      </div>
    </section>
  );
}
