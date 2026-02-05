import { DateTime } from "luxon";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toNumber } from "@/lib/utils/dates";

function csvEscape(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`;
  }
  return value;
}

function normalizeYesNo(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(trimmed)) return "yes";
  if (["no", "n", "false", "0"].includes(trimmed)) return "no";
  return null;
}

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const nowYear = DateTime.now().setZone("Australia/Sydney").year;
  const years = [nowYear - 3, nowYear - 2, nowYear - 1];

  const { data, error } = await supabase
    .from("retention_summary")
    .select(
      "year, previous_entrant, entrant_count, total_raised_sum, total_raised_count"
    )
    .is("event_group_id", null)
    .in("year", years);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{
    year: number | string | null;
    previous_entrant: string | null;
    entrant_count: number | string | null;
    total_raised_sum: number | string | null;
    total_raised_count: number | string | null;
  }>;

  const metricsByYear = new Map<number, { yes: number; no: number; yesSum: number; yesCount: number; noSum: number; noCount: number }>();
  years.forEach((year) => metricsByYear.set(year, { yes: 0, no: 0, yesSum: 0, yesCount: 0, noSum: 0, noCount: 0 }));

  rows.forEach((row) => {
    const year = toNumber(row.year);
    if (!year || !metricsByYear.has(year)) return;
    const prev = normalizeYesNo(row.previous_entrant);
    if (!prev) return;
    const count = toNumber(row.entrant_count) ?? 0;
    const sum = toNumber(row.total_raised_sum) ?? 0;
    const sumCount = toNumber(row.total_raised_count) ?? 0;
    const metrics = metricsByYear.get(year)!;
    if (prev === "yes") {
      metrics.yes += count;
      metrics.yesSum += sum;
      metrics.yesCount += sumCount;
    } else {
      metrics.no += count;
      metrics.noSum += sum;
      metrics.noCount += sumCount;
    }
  });

  const lines = [
    [
      "year",
      "repeaters",
      "repeater_percent",
      "first_time",
      "avg_raised_repeaters",
      "avg_raised_first_time"
    ].join(",")
  ];

  years.forEach((year) => {
    const metrics = metricsByYear.get(year)!;
    const total = metrics.yes + metrics.no;
    const repeatRate = total > 0 ? metrics.yes / total : 0;
    const yesAvg = metrics.yesCount > 0 ? metrics.yesSum / metrics.yesCount : 0;
    const noAvg = metrics.noCount > 0 ? metrics.noSum / metrics.noCount : 0;
    lines.push(
      [
        String(year),
        String(metrics.yes),
        repeatRate.toFixed(4),
        String(metrics.no),
        yesAvg.toFixed(2),
        noAvg.toFixed(2)
      ].map(csvEscape).join(",")
    );
  });

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"retention-national-${years[0]}-${years[2]}.csv\"`
    }
  });
}
