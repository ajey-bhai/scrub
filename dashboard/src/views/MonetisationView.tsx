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
} from "recharts";
import type { MonetisationData } from "../types";

interface Props {
  data: MonetisationData | null;
}

export function MonetisationView({ data }: Props) {
  if (!data) return <p>Loading monetisation…</p>;

  const waterfall = data.tamWaterfall;
  const maxVal = Math.max(...waterfall.map((d) => (d.type === "total" || d.type === "start" ? d.value : Math.abs(d.value))));

  return (
    <section className="view monetisation-view">
      <h2>Monetisation & TAM (RUN 5)</h2>
      <p className="subtitle">TAM waterfall: total customers to serviceable base (SAM).</p>

      <div className="chart-card full-width">
        <h3>TAM waterfall (counts)</h3>
        <p className="axis-note">N0 → less Bucket D / thin file → SAM. Values in customers; minus steps are exclusions.</p>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart
            data={waterfall}
            margin={{ top: 16, right: 24, left: 180, bottom: 48 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(v) => v.toLocaleString()}
              domain={[0, maxVal * 1.15]}
              label={{ value: "Number of customers", position: "insideBottom", offset: -16 }}
            />
            <YAxis type="category" dataKey="stage" width={170} tick={{ fontSize: 12 }} />
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
      </div>
    </section>
  );
}
