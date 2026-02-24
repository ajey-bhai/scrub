import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
  LineChart,
  Line,
} from "recharts";
import type { MonetisationData } from "../types";

function formatInrLakhs(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${n}`;
}

interface Props {
  data: MonetisationData | null;
}

export function MonetisationView({ data }: Props) {
  if (!data) return <p>Loading monetisation…</p>;

  const waterfall = data.tamWaterfall;
  const maxVal = Math.max(...waterfall.map((d) => (d.type === "total" || d.type === "start" ? d.value : Math.abs(d.value))));
  const samSegments = data.samSegments;
  const revenueModel = data.revenueModel;
  const aumProjection = data.aumProjection ?? [];

  return (
    <section className="view monetisation-view">
      <h2>Monetisation & TAM (RUN 5)</h2>
      <p className="subtitle">
        TAM waterfall, SAM segments (PL / LAC / Deferred / Excluded), expected disbursals, and revenue model with AUM at
        month 6, 12, 24.
      </p>

      <div className="chart-card full-width">
        <h3>TAM waterfall (counts)</h3>
        <p className="axis-note">
          From total unique customers (N0), we subtract Bucket D and thin file (&lt;3 tradelines) to get the serviceable
          base (SAM).
        </p>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart
            data={waterfall}
            margin={{ top: 16, right: 24, left: 200, bottom: 48 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(v) => v.toLocaleString()}
              domain={[0, maxVal * 1.15]}
            />
            <YAxis type="category" dataKey="stage" width={190} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
            <Bar dataKey="value" name="Count">
              {waterfall.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.type === "total"
                      ? "#22c55e"
                      : entry.type === "start"
                        ? "#3b82f6"
                        : entry.value < 0
                          ? "#f87171"
                          : "#94a3b8"
                  }
                />
              ))}
              <LabelList dataKey="value" position="right" formatter={(v: unknown) => (typeof v === "number" ? v.toLocaleString() : String(v))} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="chart-comment">
          SAM is the pool we can realistically target. Within SAM we segment by risk and vehicle ownership for PL vs
          LAC vs deferred.
        </p>
      </div>

      {samSegments && (
        <div className="chart-row">
          <div className="chart-card">
            <h3>SAM segments (within serviceable base)</h3>
            <p className="axis-note">
              PL eligible = risk score ≥70 (unsecured). LAC eligible = risk 40–69 with active vehicle. Deferred = 40–69
              no vehicle (hold). Excluded = risk &lt;40.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  { name: "PL eligible", count: samSegments.plEligible, fill: "#22c55e" },
                  { name: "LAC eligible", count: samSegments.lacEligible, fill: "#3b82f6" },
                  { name: "Deferred", count: samSegments.deferred, fill: "#f59e0b" },
                  { name: "Excluded", count: samSegments.excluded, fill: "#94a3b8" },
                ]}
                margin={{ top: 12, right: 24, left: 24, bottom: 48 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip formatter={(v: number | undefined) => (v != null ? v.toLocaleString() : "")} />
                <Bar dataKey="count" name="Customers">
                  <Cell fill="#22c55e" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#94a3b8" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="chart-comment">
              Disbursal assumptions: PL = PL_eligible × demand rate (32%) × take rate (25%); LAC = LAC_eligible × 20% ×
              35%.
            </p>
          </div>

          {revenueModel && (
            <div className="chart-card">
              <h3>Revenue model (Year 1)</h3>
              <p className="axis-note">
                PL: ₹75K ticket, 18 mo tenor, 24% yield, 5% credit cost, ~16% net margin. LAC: ₹1.5L, 24 mo, 20% yield,
                2% credit cost, ~15% net margin.
              </p>
              <div className="revenue-summary">
                <div className="revenue-row">
                  <span>PL disbursals</span>
                  <strong>{revenueModel.pl.disbursalsCount.toLocaleString()}</strong>
                </div>
                <div className="revenue-row">
                  <span>PL AUM (Yr1)</span>
                  <strong>{formatInrLakhs(revenueModel.pl.aumYear1Inr)}</strong>
                </div>
                <div className="revenue-row">
                  <span>PL revenue (Yr1)</span>
                  <strong>{formatInrLakhs(revenueModel.pl.revenueYear1Inr)}</strong>
                </div>
                <div className="revenue-row">
                  <span>LAC disbursals</span>
                  <strong>{revenueModel.lac.disbursalsCount.toLocaleString()}</strong>
                </div>
                <div className="revenue-row">
                  <span>LAC AUM (Yr1)</span>
                  <strong>{formatInrLakhs(revenueModel.lac.aumYear1Inr)}</strong>
                </div>
                <div className="revenue-row">
                  <span>LAC revenue (Yr1)</span>
                  <strong>{formatInrLakhs(revenueModel.lac.revenueYear1Inr)}</strong>
                </div>
                <div className="revenue-row total">
                  <span>Total AUM (Yr1)</span>
                  <strong>{formatInrLakhs(revenueModel.totalAumYear1Inr)}</strong>
                </div>
                <div className="revenue-row total">
                  <span>Total net revenue (Yr1)</span>
                  <strong>{formatInrLakhs(revenueModel.totalNetRevenueYear1Inr)}</strong>
                </div>
              </div>
              <p className="chart-comment">
                AUM uses prepayment adjustment (PL 0.75×, LAC 0.8× effective tenor). Revenue is after credit cost and
                opex.
              </p>
            </div>
          )}
        </div>
      )}

      {aumProjection.length > 0 && (
        <div className="chart-card full-width">
          <h3>AUM projection (month 6, 12, 24)</h3>
          <p className="axis-note">
            Cumulative AUM at each horizon assuming steady disbursal run rate (simplified; month 24 ≈ two years of
            vintages).
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={aumProjection} margin={{ top: 16, right: 24, left: 24, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" label={{ value: "Month", position: "insideBottom", offset: -8 }} />
              <YAxis tickFormatter={(v) => formatInrLakhs(v)} label={{ value: "AUM", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v: number | undefined) => (v != null ? formatInrLakhs(v) : "")} labelFormatter={(_, payload) => payload?.[0]?.payload?.label} />
              <Line type="monotone" dataKey="aumInr" name="AUM (₹)" stroke="#0d9488" strokeWidth={2} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="chart-comment">
            Use this to plan capital and liquidity; adjust ticket/tenor or demand assumptions in the script to stress-test.
          </p>
        </div>
      )}
    </section>
  );
}
