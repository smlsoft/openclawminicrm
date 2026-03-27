"use client";

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area,
} from "recharts";
import { CHART_COLORS, chartStyle } from "./theme";

// ─── Shared tooltip style ───
const tooltipStyle = {
  contentStyle: {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    fontSize: 11,
    color: "var(--text-primary)",
    boxShadow: "var(--shadow-md)",
  },
  itemStyle: { color: "var(--text-secondary)" },
};

// ─── Mini Pie / Donut ───
export function MiniPieChart({ data, colors, size = 160, inner = 45 }: {
  data: { name: string; value: number }[];
  colors?: string[];
  size?: number;
  inner?: number;
}) {
  const c = colors || CHART_COLORS;
  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={inner} outerRadius={size / 2 - 10}
          paddingAngle={2} dataKey="value" stroke="none" style={chartStyle}>
          {data.map((_, i) => <Cell key={i} fill={c[i % c.length]} />)}
        </Pie>
        <Tooltip {...tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Mini Bar Chart ───
export function MiniBarChart({ data, dataKey = "value", nameKey = "name", color, colors, height = 200, layout = "vertical" }: {
  data: any[];
  dataKey?: string;
  nameKey?: string;
  color?: string;
  colors?: Record<string, string>;
  height?: number;
  layout?: "vertical" | "horizontal";
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout === "vertical" ? "vertical" : "horizontal"}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        {layout === "vertical" ? (
          <>
            <XAxis type="number" tick={{ fill: "var(--text-muted)", ...chartStyle }} />
            <YAxis type="category" dataKey={nameKey} tick={{ fill: "var(--text-muted)", ...chartStyle }} width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey={nameKey} tick={{ fill: "var(--text-muted)", ...chartStyle }} />
            <YAxis tick={{ fill: "var(--text-muted)", ...chartStyle }} />
          </>
        )}
        <Tooltip {...tooltipStyle} />
        <Bar dataKey={dataKey} radius={[4, 4, 4, 4]}>
          {colors ? data.map((d, i) => (
            <Cell key={i} fill={colors[d[nameKey]] || CHART_COLORS[i % CHART_COLORS.length]} />
          )) : data.map((_, i) => (
            <Cell key={i} fill={color || CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Mini Line Chart ───
export function MiniLineChart({ data, dataKey = "value", nameKey = "name", color, height = 200, area = false }: {
  data: any[];
  dataKey?: string | string[];
  nameKey?: string;
  color?: string;
  height?: number;
  area?: boolean;
}) {
  const keys = Array.isArray(dataKey) ? dataKey : [dataKey];
  const Chart = area ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={nameKey} tick={{ fill: "var(--text-muted)", ...chartStyle }} />
        <YAxis tick={{ fill: "var(--text-muted)", ...chartStyle }} />
        <Tooltip {...tooltipStyle} />
        {keys.map((k, i) => area ? (
          <Area key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i]}
            fill={CHART_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
        ) : (
          <Line key={k} type="monotone" dataKey={k} stroke={color || CHART_COLORS[i]}
            strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS[i] }} />
        ))}
      </Chart>
    </ResponsiveContainer>
  );
}

// ─── Legend ───
export function ChartLegend({ items }: { items: { label: string; color: string; value?: number | string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {item.label}{item.value != null ? `: ${item.value}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
