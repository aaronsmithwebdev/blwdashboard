import { DateTime } from "luxon";

import { RetentionBarChart } from "@/components/charts/retention-bar-chart";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toNumber } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  focusYear?: string | string[];
};

type RetentionSummaryRow = {
  year: number | string | null;
  event_group_id: string | null;
  event_group_label: string | null;
  previous_entrant: string | null;
  entrant_count: number | string | null;
  total_raised_sum: number | string | null;
  total_raised_count: number | string | null;
};

type YearMetrics = {
  yesCount: number;
  noCount: number;
  yesRaisedSum: number;
  yesRaisedCount: number;
  noRaisedSum: number;
  noRaisedCount: number;
};

const SYDNEY_ZONE = "Australia/Sydney";

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

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "--";
  return `${(value * 100).toFixed(1)}%`;
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

  const nowYear = DateTime.now().setZone(SYDNEY_ZONE).year;
  const yearOptions = [nowYear - 3, nowYear - 2, nowYear - 1];

  const rawFocusYear = Array.isArray(searchParams?.focusYear)
    ? searchParams?.focusYear[0]
    : searchParams?.focusYear;
  const parsedFocusYear = rawFocusYear ? Number(rawFocusYear) : NaN;
  const defaultFocusYear = nowYear - 1;
  const focusYear = yearOptions.includes(parsedFocusYear) ? parsedFocusYear : defaultFocusYear;

  const { data, error } = await supabase
    .from("retention_summary")
    .select(
      "year, event_group_id, event_group_label, previous_entrant, entrant_count, total_raised_sum, total_raised_count"
    )
    .in("year", yearOptions);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Retention</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The retention cache has not been generated yet.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Missing retention summary</CardTitle>
            <CardDescription>
              Create and refresh the retention materialized view, then refresh this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = (data ?? []) as RetentionSummaryRow[];
  const nationalByYear = new Map<number, YearMetrics>();
  const groupMetrics = new Map<string, YearMetrics>();
  yearOptions.forEach((year) => nationalByYear.set(year, createYearMetrics()));

  rows.forEach((row) => {
    const year = toNumber(row.year);
    if (!year || !yearOptions.includes(year)) return;

    const previous = normalizeYesNo(row.previous_entrant);
    if (!previous) return;

    const count = toNumber(row.entrant_count) ?? 0;
    const sum = toNumber(row.total_raised_sum) ?? 0;
    const sumCount = toNumber(row.total_raised_count) ?? 0;

    if (!row.event_group_id) {
      const metrics = nationalByYear.get(year) ?? createYearMetrics();
      if (previous === "yes") {
        metrics.yesCount += count;
        metrics.yesRaisedSum += sum;
        metrics.yesRaisedCount += sumCount;
      } else {
        metrics.noCount += count;
        metrics.noRaisedSum += sum;
        metrics.noRaisedCount += sumCount;
      }
      nationalByYear.set(year, metrics);
      return;
    }

    if (year !== focusYear) return;
    const label = row.event_group_label ?? `Group ${row.event_group_id}`;
    const metrics = groupMetrics.get(label) ?? createYearMetrics();
    if (previous === "yes") {
      metrics.yesCount += count;
      metrics.yesRaisedSum += sum;
      metrics.yesRaisedCount += sumCount;
    } else {
      metrics.noCount += count;
      metrics.noRaisedSum += sum;
      metrics.noRaisedCount += sumCount;
    }
    groupMetrics.set(label, metrics);
  });

  const chartData = yearOptions.map((year) => {
    const metrics = nationalByYear.get(year) ?? createYearMetrics();
    return {
      year: String(year),
      yes_count: metrics.yesCount,
      no_count: metrics.noCount,
      yes_avg: safeAverage(metrics.yesRaisedSum, metrics.yesRaisedCount) ?? 0,
      no_avg: safeAverage(metrics.noRaisedSum, metrics.noRaisedCount) ?? 0
    };
  });

  const nationalTableRows = yearOptions.map((year) => {
    const metrics = nationalByYear.get(year) ?? createYearMetrics();
    const total = metrics.yesCount + metrics.noCount;
    return {
      year,
      yes_count: metrics.yesCount,
      no_count: metrics.noCount,
      yes_avg: safeAverage(metrics.yesRaisedSum, metrics.yesRaisedCount),
      no_avg: safeAverage(metrics.noRaisedSum, metrics.noRaisedCount),
      repeat_rate: total > 0 ? metrics.yesCount / total : null
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

  const groupTableRows = groupChartData.map((row) => {
    const total = row.yes_count + row.no_count;
    return {
      group: row.group,
      yes_count: row.yes_count,
      no_count: row.no_count,
      yes_avg: row.yes_avg,
      no_avg: row.no_avg,
      repeat_rate: total > 0 ? row.yes_count / total : null
    };
  });

  const totals = yearOptions.reduce(
    (acc, year) => {
      const metrics = nationalByYear.get(year) ?? createYearMetrics();
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
          National repeat participation using previous_entrant (yes/no) for the last three years
          ({yearOptions.join(", ")}). Event splits use your event groups.
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>National retention table</CardTitle>
              <CardDescription>
                Repeat vs first-time counts and average total_raised for the last three years.
              </CardDescription>
            </div>
            <a
              href="/api/reports/retention/national"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Download CSV
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Repeaters</TableHead>
                <TableHead className="text-right">Repeater %</TableHead>
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
                  <TableCell className="text-right">{formatPercent(row.repeat_rate)}</TableCell>
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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Event-group retention table ({focusYear})</CardTitle>
              <CardDescription>
                Repeat vs first-time counts and average total_raised for the focus year.
              </CardDescription>
            </div>
            <a
              href={`/api/reports/retention/event-groups?year=${focusYear}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Download CSV
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {groupTableRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grouped data for {focusYear}.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event group</TableHead>
                  <TableHead className="text-right">Repeaters</TableHead>
                  <TableHead className="text-right">Repeater %</TableHead>
                  <TableHead className="text-right">First-time</TableHead>
                  <TableHead className="text-right">Avg raised (repeaters)</TableHead>
                  <TableHead className="text-right">Avg raised (first-time)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupTableRows.map((row) => (
                  <TableRow key={row.group}>
                    <TableCell>{row.group}</TableCell>
                    <TableCell className="text-right">{formatCount(row.yes_count)}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.repeat_rate)}</TableCell>
                    <TableCell className="text-right">{formatCount(row.no_count)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.yes_avg)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.no_avg)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
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
