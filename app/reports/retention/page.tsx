import { DateTime } from "luxon";

import { RetentionBarChart } from "@/components/charts/retention-bar-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { coerceBoolean, toNumber } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  focusYear?: string | string[];
};

type EventEntryRow = {
  event_id: number | string | null;
  member_id: number | string | null;
  is_paid: boolean | null;
  date_paid: string | null;
  date_created: string | null;
  previous_entrant: string | null;
  total_raised: number | string | null;
};

type YearMetrics = {
  yesCount: number;
  noCount: number;
  yesRaisedSum: number;
  yesRaisedCount: number;
  noRaisedSum: number;
  noRaisedCount: number;
};

type EventGroup = {
  id: string;
  event_category_id: string;
  year: number;
};

type EventMapping = {
  event_group_id: string;
  event_id: number | string | null;
  include_in_reporting: boolean | null;
};

const SYDNEY_ZONE = "Australia/Sydney";

function toSydneyYear(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("0000-00-00")) return null;
  const isoParsed = DateTime.fromISO(trimmed, { zone: SYDNEY_ZONE });
  if (isoParsed.isValid) return isoParsed.year;
  const fallback = DateTime.fromFormat(trimmed, "yyyy-MM-dd HH:mm:ss", { zone: SYDNEY_ZONE });
  if (fallback.isValid) return fallback.year;
  const dateOnly = DateTime.fromFormat(trimmed, "yyyy-MM-dd", { zone: SYDNEY_ZONE });
  return dateOnly.isValid ? dateOnly.year : null;
}

function normalizeYesNo(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(trimmed)) return "yes";
  if (["no", "n", "false", "0"].includes(trimmed)) return "no";
  return null;
}

function createYearMetrics(): YearMetrics {
  return {
    yesCount: 0,
    noCount: 0,
    yesRaisedSum: 0,
    yesRaisedCount: 0,
    noRaisedSum: 0,
    noRaisedCount: 0
  };
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-AU").format(value);
}

function formatCurrency(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0
  }).format(value);
}

function safeAverage(sum: number, count: number) {
  if (count === 0) return null;
  return sum / count;
}

function abbreviateEventLabel(label: string) {
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 0) return label;
  const segments = words.slice(0, 2).map((word) => {
    const segment = word.slice(0, 3);
    if (!segment) return word;
    if (word === word.toUpperCase()) return segment.toUpperCase();
    return `${segment[0].toUpperCase()}${segment.slice(1).toLowerCase()}`;
  });
  return segments.join(" ");
}

export default async function RetentionReportPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createSupabaseAdminClient();
  const PAGE_SIZE = 1000;

  const nowYear = DateTime.now().setZone(SYDNEY_ZONE).year;
  const yearOptions = [nowYear - 3, nowYear - 2, nowYear - 1];

  const rawFocusYear = Array.isArray(searchParams?.focusYear)
    ? searchParams?.focusYear[0]
    : searchParams?.focusYear;
  const parsedFocusYear = rawFocusYear ? Number(rawFocusYear) : NaN;
  const defaultFocusYear = nowYear - 1;
  const focusYear = yearOptions.includes(parsedFocusYear) ? parsedFocusYear : defaultFocusYear;

  const [groupsResult, categoriesResult, mappingsResult] = await Promise.all([
    supabase.from("event_group").select("id, event_category_id, year"),
    supabase.from("event_category").select("id, display_name"),
    supabase
      .from("event_group_event")
      .select("event_group_id, event_id, include_in_reporting")
  ]);

  if (groupsResult.error) {
    return <p className="text-sm text-red-600">{groupsResult.error.message}</p>;
  }
  if (categoriesResult.error) {
    return <p className="text-sm text-red-600">{categoriesResult.error.message}</p>;
  }
  if (mappingsResult.error) {
    return <p className="text-sm text-red-600">{mappingsResult.error.message}</p>;
  }

  const groups = (groupsResult.data ?? []) as EventGroup[];
  const categories = (categoriesResult.data ?? []) as { id: string; display_name: string }[];
  const categoryById = new Map(categories.map((category) => [category.id, category.display_name]));

  const groupById = new Map<string, { year: number; label: string }>();
  groups.forEach((group) => {
    const label = categoryById.get(group.event_category_id) ?? `Group ${group.id}`;
    groupById.set(group.id, { year: Number(group.year), label });
  });

  const groupLabelByYearEvent = new Map<string, string>();
  (mappingsResult.data ?? []).forEach((mapping: EventMapping) => {
    if (mapping.include_in_reporting === false) return;
    if (mapping.event_id === null || mapping.event_id === undefined) return;
    const groupInfo = groupById.get(mapping.event_group_id);
    if (!groupInfo) return;
    const year = groupInfo.year;
    const label = groupInfo.label;
    const key = `${year}:${String(mapping.event_id)}`;
    if (!groupLabelByYearEvent.has(key)) {
      groupLabelByYearEvent.set(key, label);
    }
  });

  const yearMetrics = new Map<number, YearMetrics>();
  yearOptions.forEach((year) => yearMetrics.set(year, createYearMetrics()));

  const groupMetrics = new Map<string, YearMetrics>();

  const entries: EventEntryRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("event_entries")
      .select("event_id, member_id, is_paid, date_paid, date_created, previous_entrant, total_raised")
      .eq("is_paid", true)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return <p className="text-sm text-red-600">{error.message}</p>;
    }

    const batch = (data ?? []) as EventEntryRow[];
    entries.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  entries.forEach((entry) => {
    if (!coerceBoolean(entry.is_paid)) return;
    const year = toSydneyYear(entry.date_paid ?? entry.date_created);
    if (!year || !yearMetrics.has(year)) return;

    const prev = normalizeYesNo(entry.previous_entrant);
    if (!prev) return;

    const metrics = yearMetrics.get(year)!;
    const totalRaised = toNumber(entry.total_raised);

    if (prev === "yes") {
      metrics.yesCount += 1;
      if (totalRaised !== null) {
        metrics.yesRaisedSum += totalRaised;
        metrics.yesRaisedCount += 1;
      }
    } else {
      metrics.noCount += 1;
      if (totalRaised !== null) {
        metrics.noRaisedSum += totalRaised;
        metrics.noRaisedCount += 1;
      }
    }

    if (year !== focusYear) return;
    if (entry.event_id === null || entry.event_id === undefined) return;
    const groupKey = groupLabelByYearEvent.get(`${year}:${String(entry.event_id)}`);
    if (!groupKey) return;

    if (!groupMetrics.has(groupKey)) groupMetrics.set(groupKey, createYearMetrics());
    const groupMetric = groupMetrics.get(groupKey)!;

    if (prev === "yes") {
      groupMetric.yesCount += 1;
      if (totalRaised !== null) {
        groupMetric.yesRaisedSum += totalRaised;
        groupMetric.yesRaisedCount += 1;
      }
    } else {
      groupMetric.noCount += 1;
      if (totalRaised !== null) {
        groupMetric.noRaisedSum += totalRaised;
        groupMetric.noRaisedCount += 1;
      }
    }
  });

  const chartData = yearOptions.map((year) => {
    const metrics = yearMetrics.get(year)!;
    return {
      year: String(year),
      yes_count: metrics.yesCount,
      no_count: metrics.noCount,
      yes_avg: safeAverage(metrics.yesRaisedSum, metrics.yesRaisedCount) ?? 0,
      no_avg: safeAverage(metrics.noRaisedSum, metrics.noRaisedCount) ?? 0
    };
  });

  const nationalTableRows = yearOptions.map((year) => {
    const metrics = yearMetrics.get(year)!;
    return {
      year,
      yes_count: metrics.yesCount,
      no_count: metrics.noCount,
      yes_avg: safeAverage(metrics.yesRaisedSum, metrics.yesRaisedCount),
      no_avg: safeAverage(metrics.noRaisedSum, metrics.noRaisedCount)
    };
  });

  const groupChartData = Array.from(groupMetrics.entries())
    .map(([label, metrics]) => ({
      group: label,
      group_short: abbreviateEventLabel(label),
      yes_count: metrics.yesCount,
      no_count: metrics.noCount,
      yes_avg: safeAverage(metrics.yesRaisedSum, metrics.yesRaisedCount) ?? 0,
      no_avg: safeAverage(metrics.noRaisedSum, metrics.noRaisedCount) ?? 0
    }))
    .sort((a, b) => b.yes_count + b.no_count - (a.yes_count + a.no_count));

  const totals = yearOptions.reduce(
    (acc, year) => {
      const metrics = yearMetrics.get(year)!;
      acc.yesCount += metrics.yesCount;
      acc.noCount += metrics.noCount;
      acc.yesRaisedSum += metrics.yesRaisedSum;
      acc.yesRaisedCount += metrics.yesRaisedCount;
      acc.noRaisedSum += metrics.noRaisedSum;
      acc.noRaisedCount += metrics.noRaisedCount;
      return acc;
    },
    {
      yesCount: 0,
      noCount: 0,
      yesRaisedSum: 0,
      yesRaisedCount: 0,
      noRaisedSum: 0,
      noRaisedCount: 0
    }
  );

  const yesAvg = safeAverage(totals.yesRaisedSum, totals.yesRaisedCount);
  const noAvg = safeAverage(totals.noRaisedSum, totals.noRaisedCount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Retention</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          National repeat participation using previous_entrant (yes/no) for the last three Sydney
          years ({yearOptions.join(", ")}). Event splits use your event groups.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Focus Year</CardTitle>
          <CardDescription>Select the year for event-group breakdowns.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label htmlFor="focusYear" className="text-sm font-medium">
                Event-group year
              </label>
              <select
                id="focusYear"
                name="focusYear"
                defaultValue={String(focusYear)}
                className="h-10 min-w-[140px] rounded-md border border-input bg-background/70 px-3 text-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Previously done the walk</CardTitle>
            <CardDescription>Answered yes to previous_entrant.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCount(totals.yesCount)}</p>
            <p className="text-xs text-muted-foreground">Avg raised {formatCurrency(yesAvg)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>First-time walkers</CardTitle>
            <CardDescription>Answered no to previous_entrant.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCount(totals.noCount)}</p>
            <p className="text-xs text-muted-foreground">Avg raised {formatCurrency(noAvg)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>National retention table</CardTitle>
          <CardDescription>
            Repeat vs first-time counts and average total_raised for the last three years.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Repeaters</TableHead>
                <TableHead className="text-right">First-time</TableHead>
                <TableHead className="text-right">Avg raised (repeaters)</TableHead>
                <TableHead className="text-right">Avg raised (first-time)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nationalTableRows.map((row) => (
                <TableRow key={row.year}>
                  <TableCell>{row.year}</TableCell>
                  <TableCell className="text-right">{formatCount(row.yes_count)}</TableCell>
                  <TableCell className="text-right">{formatCount(row.no_count)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.yes_avg)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.no_avg)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>National repeat counts (by year)</CardTitle>
            <CardDescription>Yes vs no using previous_entrant.</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionBarChart
              data={chartData}
              xKey="year"
              series={[
                {
                  key: "yes_count",
                  label: "Previously done the walk",
                  color: "hsl(var(--primary))",
                  stackId: "national"
                },
                {
                  key: "no_count",
                  label: "First-time walkers",
                  color: "hsl(var(--accent))",
                  stackId: "national"
                }
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>National average raised (by year)</CardTitle>
            <CardDescription>Average total_raised per person.</CardDescription>
          </CardHeader>
          <CardContent>
            <RetentionBarChart
              data={chartData}
              xKey="year"
              valueFormat="currency"
              series={[
                {
                  key: "yes_avg",
                  label: "Previously done the walk",
                  color: "hsl(var(--primary))"
                },
                {
                  key: "no_avg",
                  label: "First-time walkers",
                  color: "hsl(var(--accent))"
                }
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event-group repeat counts ({focusYear})</CardTitle>
            <CardDescription>Yes vs no by event group.</CardDescription>
          </CardHeader>
          <CardContent>
            {groupChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No grouped data for {focusYear}.</p>
            ) : (
              <RetentionBarChart
                data={groupChartData}
                xKey="group_short"
                xTickAngle={-25}
                xTickHeight={72}
                series={[
                  {
                    key: "yes_count",
                    label: "Previously done the walk",
                    color: "hsl(200 70% 55%)",
                    stackId: "group"
                  },
                  {
                    key: "no_count",
                    label: "First-time walkers",
                    color: "hsl(160 55% 50%)",
                    stackId: "group"
                  }
                ]}
                height={360}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event-group average raised ({focusYear})</CardTitle>
            <CardDescription>Average total_raised per person.</CardDescription>
          </CardHeader>
          <CardContent>
            {groupChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No grouped data for {focusYear}.</p>
            ) : (
              <RetentionBarChart
                data={groupChartData}
                xKey="group_short"
                valueFormat="currency"
                xTickAngle={-25}
                xTickHeight={72}
                series={[
                  {
                    key: "yes_avg",
                    label: "Previously done the walk",
                    color: "hsl(200 70% 55%)"
                  },
                  {
                    key: "no_avg",
                    label: "First-time walkers",
                    color: "hsl(160 55% 50%)"
                  }
                ]}
                height={360}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
