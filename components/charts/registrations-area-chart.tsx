"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { cn } from "@/lib/utils";

type ChartDatum = {
  weekIndex: number;
  weekLabel: string;
  primary: number | null;
  compare?: number | null;
  compare2?: number | null;
  projection?: number | null;
  markersPrimary?: string[];
  markersCompare?: string[];
};

type ChartMarker = {
  weekIndex: number;
  value: number;
  label: string;
  series: "primary" | "compare" | "event";
};

type RegistrationsAreaChartProps = {
  data: ChartDatum[];
  primaryLabel: string;
  compareLabel?: string | null;
  compare2Label?: string | null;
  markers?: ChartMarker[];
  projectionLabel?: string | null;
  valueFormat?: "number" | "currency";
  className?: string;
};

export function RegistrationsAreaChart({
  data,
  primaryLabel,
  compareLabel,
  compare2Label,
  markers,
  projectionLabel,
  valueFormat = "number",
  className
}: RegistrationsAreaChartProps) {
  const markerColor = (series: ChartMarker["series"]) => {
    if (series === "event") return "hsl(140 60% 45%)";
    return "hsl(45 90% 55%)";
  };
  const labelByIndex = useMemo(() => {
    return new Map(data.map((point) => [point.weekIndex, point.weekLabel]));
  }, [data]);
  const formatter = useMemo(() => {
    if (valueFormat === "currency") {
      return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0
      });
    }
    return new Intl.NumberFormat("en-AU");
  }, [valueFormat]);
  const formatValue = (value: number) => formatter.format(Number(value ?? 0));
  const formatTick = (value: number) =>
    valueFormat === "currency" ? formatter.format(Number(value ?? 0)) : String(value);

  return (
    <div className={cn("h-full w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 24, right: 24, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="registrationsPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.42} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="registrationsCompare" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.28} />
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="registrationsCompareAlt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(200 60% 55%)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="hsl(200 60% 55%)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey="weekIndex"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickMargin={12}
            tickFormatter={(value) => labelByIndex.get(Number(value)) ?? value}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            reversed={false}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickMargin={12}
            tickFormatter={formatTick}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 6" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const chartPoint = payload[0]?.payload as ChartDatum | undefined;
              const displayLabel = chartPoint?.weekLabel ?? (label !== undefined ? String(label) : "");
              return (
                <div className="rounded-lg border border-border/60 bg-white/95 p-3 text-xs shadow-lg">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {displayLabel === "Event"
                      ? "Event week"
                      : displayLabel.includes("after")
                        ? `${displayLabel.replace("w", " week")} after event`
                        : `${displayLabel.replace("w", " week")} before event`}
                  </p>
                  <div className="mt-2 space-y-1">
                    {payload.map((entry, index) => (
                      <div
                        key={`${entry.name ?? "series"}-${index}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-xs text-foreground/80">{entry.name}</span>
                        <span className="text-xs font-semibold text-foreground">
                          {formatValue(Number(entry.value ?? 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                  {chartPoint?.markersPrimary?.length ? (
                    <div className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      <p className="font-semibold text-foreground">Primary price changes</p>
                      <ul className="mt-1 space-y-1">
                        {chartPoint.markersPrimary.map((marker, index) => (
                          <li key={`primary-${index}`}>{marker}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {chartPoint?.markersCompare?.length ? (
                    <div className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      <p className="font-semibold text-foreground">Comparison price changes</p>
                      <ul className="mt-1 space-y-1">
                        {chartPoint.markersCompare.map((marker, index) => (
                          <li key={`compare-${index}`}>{marker}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            }}
          />
          {markers?.map((marker, index) => (
            <ReferenceDot
              key={`${marker.series}-${marker.weekIndex}-${index}`}
              x={marker.weekIndex}
              y={marker.value}
              r={6}
              fill={markerColor(marker.series)}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          )) ?? null}
          {compareLabel ? (
            <Area
              type="monotone"
              dataKey="compare"
              name={compareLabel}
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="url(#registrationsCompare)"
              dot={false}
              isAnimationActive={false}
            />
          ) : null}
          {compare2Label ? (
            <Area
              type="monotone"
              dataKey="compare2"
              name={compare2Label}
              stroke="hsl(200 60% 55%)"
              strokeWidth={2}
              fill="url(#registrationsCompareAlt)"
              dot={false}
              isAnimationActive={false}
            />
          ) : null}
          {projectionLabel ? (
            <Area
              type="monotone"
              dataKey="projection"
              name={projectionLabel}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="6 6"
              fillOpacity={0}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="primary"
            name={primaryLabel}
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            fill="url(#registrationsPrimary)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
