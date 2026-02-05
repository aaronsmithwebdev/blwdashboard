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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  if (!Number.isFinite(parsedYear) || parsedYear < 2000) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("retention_summary")
    .select(
      "event_group_label, previous_entrant, entrant_count, total_raised_sum, total_raised_count"
    )
    .eq("year", parsedYear)
    .not("event_group_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{
    event_group_label: string | null;
    previous_entrant: string | null;
    entrant_count: number | string | null;
    total_raised_sum: number | string | null;
    total_raised_count: number | string | null;
  }>;

  const metricsByGroup = new Map<
    string,
    { yes: number; no: number; yesSum: number; yesCount: number; noSum: number; noCount: number }
  >();

  rows.forEach((row) => {
    const label = row.event_group_label ?? "Event group";
    const prev = normalizeYesNo(row.previous_entrant);
    if (!prev) return;
    const count = toNumber(row.entrant_count) ?? 0;
    const sum = toNumber(row.total_raised_sum) ?? 0;
    const sumCount = toNumber(row.total_raised_count) ?? 0;
    const metrics =
      metricsByGroup.get(label) ?? { yes: 0, no: 0, yesSum: 0, yesCount: 0, noSum: 0, noCount: 0 };
    if (prev === "yes") {
      metrics.yes += count;
      metrics.yesSum += sum;
      metrics.yesCount += sumCount;
    } else {
      metrics.no += count;
      metrics.noSum += sum;
      metrics.noCount += sumCount;
    }
    metricsByGroup.set(label, metrics);
  });

  const lines = [
    [
      "event_group",
      "repeaters",
      "repeater_percent",
      "first_time",
      "avg_raised_repeaters",
      "avg_raised_first_time"
    ].join(",")
  ];

  Array.from(metricsByGroup.entries())
    .sort((a, b) => b[1].yes + b[1].no - (a[1].yes + a[1].no))
    .forEach(([label, metrics]) => {
      const total = metrics.yes + metrics.no;
      const repeatRate = total > 0 ? metrics.yes / total : 0;
      const yesAvg = metrics.yesCount > 0 ? metrics.yesSum / metrics.yesCount : 0;
      const noAvg = metrics.noCount > 0 ? metrics.noSum / metrics.noCount : 0;
      lines.push(
        [
          label,
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
      "Content-Disposition": `attachment; filename=\"retention-event-groups-${parsedYear}.csv\"`
    }
  });
}
