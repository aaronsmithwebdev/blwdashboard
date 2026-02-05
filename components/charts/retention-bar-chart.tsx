"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { cn } from "@/lib/utils";

type Series = {
  key: string;
  label: string;
  color: string;
  stackId?: string;
};

type RetentionBarChartProps = {
  data: Array<Record<string, string | number | null>>;
  xKey: string;
  series: Series[];
  xTickFormatter?: (value: string | number) => string;
  xTickAngle?: number;
  xTickHeight?: number;
  xTickTextAnchor?: "start" | "middle" | "end";
  valueFormat?: "number" | "currency";
  height?: number;
  className?: string;
};

const numberFormatter = new Intl.NumberFormat("en-AU");
const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0
});

function formatValue(value: number, format: "number" | "currency") {
  if (format === "currency") return currencyFormatter.format(value);
  return numberFormatter.format(value);
}

export function RetentionBarChart({
  data,
  xKey,
  series,
  xTickFormatter,
  xTickAngle,
  xTickHeight,
  xTickTextAnchor,
  valueFormat = "number",
  height = 280,
  className
}: RetentionBarChartProps) {
  const xTick = {
    fill: "hsl(var(--muted-foreground))",
    fontSize: 12,
    ...(xTickAngle !== undefined
      ? { angle: xTickAngle, textAnchor: xTickTextAnchor ?? "end" }
      : {})
  };

  return (
    <div className={cn("h-full w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 6" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={xTick}
            tickFormatter={xTickFormatter}
            height={xTickAngle !== undefined ? xTickHeight ?? 60 : undefined}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(value) => formatValue(Number(value ?? 0), valueFormat)}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
            formatter={(value) => formatValue(Number(value ?? 0), valueFormat)}
            contentStyle={{
              borderRadius: "12px",
              borderColor: "hsl(var(--border))",
              background: "rgba(255, 255, 255, 0.95)",
              fontSize: "12px"
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              fill={item.color}
              stackId={item.stackId}
              radius={[6, 6, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
