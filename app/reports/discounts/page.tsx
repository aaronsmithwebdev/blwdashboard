import { DateTime } from "luxon";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { coerceBoolean, toSydneyISOEnd, toSydneyISOStart } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  year?: string | string[];
};

type EventGroup = {
  id: string;
  event_category_id: string;
  year: number;
};

type DiscountTier = {
  id: string;
  event_group_id: string;
  label: string;
  starts_at: string | null;
  ends_at: string | null;
};

type EventMapping = {
  event_group_id: string;
  event_id: number | string;
  include_in_reporting: boolean | null;
};

type EventEntry = {
  history_id: number;
  event_id: number | string | null;
  is_paid: boolean | null;
  date_paid: string | null;
  date_created: string | null;
  total_paid_entry: number | null;
};

type EventRow = {
  groupId: string;
  discountName: string;
  entrants: number;
  revenue: number;
  startsAt: string | null;
  endsAt: string | null;
};

function toSydneyDate(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("0000-00-00")) return null;
  const isoParsed = DateTime.fromISO(trimmed, { zone: "Australia/Sydney" });
  if (isoParsed.isValid) return isoParsed.toISODate();
  const fallback = DateTime.fromFormat(trimmed, "yyyy-MM-dd HH:mm:ss", {
    zone: "Australia/Sydney"
  });
  if (fallback.isValid) return fallback.toISODate();
  const dateOnly = DateTime.fromFormat(trimmed, "yyyy-MM-dd", { zone: "Australia/Sydney" });
  return dateOnly.isValid ? dateOnly.toISODate() : null;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2
  }).format(value);
}

export default async function DiscountReportPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createSupabaseAdminClient();
  const PAGE_SIZE = 1000;

  const [groupsResult, categoriesResult] = await Promise.all([
    supabase.from("event_group").select("id, event_category_id, year").order("year", {
      ascending: false
    }),
    supabase.from("event_category").select("id, display_name").order("display_name", {
      ascending: true
    })
  ]);

  if (groupsResult.error) {
    return <p className="text-sm text-red-600">{groupsResult.error.message}</p>;
  }

  if (categoriesResult.error) {
    return <p className="text-sm text-red-600">{categoriesResult.error.message}</p>;
  }

  const groups = (groupsResult.data ?? []) as EventGroup[];
  const categories = (categoriesResult.data ?? []) as { id: string; display_name: string }[];
  const categoryById = new Map(categories.map((category) => [category.id, category.display_name]));
  const availableYears = Array.from(
    new Set(
      groups
        .map((group) => Number(group.year))
        .filter((year) => Number.isFinite(year)) as number[]
    )
  ).sort((a, b) => b - a);

  const nowYear = DateTime.now().setZone("Australia/Sydney").year;
  const rawYears = Array.isArray(searchParams?.year)
    ? searchParams?.year
    : searchParams?.year
      ? [searchParams.year]
      : [];
  const parsedYears = rawYears
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isFinite(value) && value > 2000);
  const uniqueYears = Array.from(new Set(parsedYears));
  const selectedYears = (uniqueYears.length ? uniqueYears : [nowYear]).slice(0, 3);
  const selectedYearsSorted = [...selectedYears].sort((a, b) => b - a);

  const yearOptions = Array.from(new Set([...selectedYearsSorted, ...availableYears])).sort(
    (a, b) => b - a
  );

  const selectedYearKeys = new Set(selectedYearsSorted.map((year) => String(year)));
  const groupsForYears = groups.filter((group) =>
    selectedYearKeys.has(String(group.year).trim())
  );
  const groupIds = groupsForYears.map((group) => group.id);
  const selectedYearsLabel = selectedYearsSorted.join(", ");

  const [discountsResult, mappingsResult] = groupIds.length
    ? await Promise.all([
        supabase
          .from("event_group_discount")
          .select("id, event_group_id, label, starts_at, ends_at")
          .in("event_group_id", groupIds),
        supabase
          .from("event_group_event")
          .select("event_group_id, event_id, include_in_reporting")
          .in("event_group_id", groupIds)
      ])
    : [
        { data: [], error: null },
        { data: [], error: null }
      ];

  if (discountsResult.error) {
    return <p className="text-sm text-red-600">{discountsResult.error.message}</p>;
  }

  if (mappingsResult.error) {
    return <p className="text-sm text-red-600">{mappingsResult.error.message}</p>;
  }

  const discounts = (discountsResult.data ?? []) as DiscountTier[];
  const mappings = (mappingsResult.data ?? []) as EventMapping[];

  const eventIds = Array.from(
    new Set(
      mappings
        .filter((mapping) => mapping.include_in_reporting !== false)
        .map((mapping) => mapping.event_id)
    )
  );

  const tiersByGroup = new Map<string, DiscountTier[]>();
  const starts = discounts.map((tier) => tier.starts_at).filter(Boolean) as string[];
  const ends = discounts.map((tier) => tier.ends_at).filter(Boolean) as string[];
  discounts.forEach((tier) => {
    if (!tiersByGroup.has(tier.event_group_id)) {
      tiersByGroup.set(tier.event_group_id, []);
    }
    tiersByGroup.get(tier.event_group_id)?.push(tier);
  });
  tiersByGroup.forEach((list) => list.sort((a, b) => (a.ends_at ?? "").localeCompare(b.ends_at ?? "")));

  const minStart = starts.length ? starts.sort()[0] : null;
  const maxEnd = ends.length ? ends.sort()[ends.length - 1] : null;

  const hasDateBoundTiers = starts.length > 0 && ends.length > 0;

  let entries: EventEntry[] = [];
  if (eventIds.length && hasDateBoundTiers) {
    let offset = 0;
    while (true) {
      let entriesQuery = supabase
        .from("event_entries")
        .select("history_id, event_id, is_paid, date_paid, date_created, total_paid_entry")
        .in("event_id", eventIds)
        .range(offset, offset + PAGE_SIZE - 1);

      if (minStart) {
        const minIso = toSydneyISOStart(minStart);
        if (minIso) {
          entriesQuery = entriesQuery.or(`date_paid.gte.${minIso},date_created.gte.${minIso}`);
        }
      }
      if (maxEnd) {
        const maxIso = toSydneyISOEnd(maxEnd);
        if (maxIso) {
          entriesQuery = entriesQuery.or(`date_paid.lte.${maxIso},date_created.lte.${maxIso}`);
        }
      }

      const { data, error } = await entriesQuery;
      if (error) {
        return <p className="text-sm text-red-600">{error.message}</p>;
      }

      const batch = (data ?? []) as EventEntry[];
      entries.push(...batch);

      if (batch.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }
  }

  const groupIdsByEvent = new Map<string, string[]>();
  mappings.forEach((mapping) => {
    if (mapping.include_in_reporting === false) return;
    if (mapping.event_id === null || mapping.event_id === undefined) return;
    const eventKey = String(mapping.event_id);
    if (!groupIdsByEvent.has(eventKey)) {
      groupIdsByEvent.set(eventKey, []);
    }
    groupIdsByEvent.get(eventKey)?.push(mapping.event_group_id);
  });

  const rowMap = new Map<string, EventRow>();

  groupsForYears.forEach((group) => {
    const tiers = tiersByGroup.get(group.id) ?? [];
    tiers.forEach((tier) => {
      const key = `${group.id}:${tier.id}`;
      if (rowMap.has(key)) return;
      rowMap.set(key, {
        groupId: group.id,
        discountName: tier.label,
        entrants: 0,
        revenue: 0,
        startsAt: tier.starts_at,
        endsAt: tier.ends_at
      });
    });
  });

  entries.forEach((entry) => {
    if (!coerceBoolean(entry.is_paid)) return;
    const paidDate = toSydneyDate(entry.date_paid ?? entry.date_created);
    if (!paidDate) return;
    if (entry.event_id === null || entry.event_id === undefined) return;
    const groupIdsForEvent = groupIdsByEvent.get(String(entry.event_id));
    if (!groupIdsForEvent) return;

    groupIdsForEvent.forEach((groupId) => {
      const tiers = tiersByGroup.get(groupId);
      if (!tiers || tiers.length === 0) return;
      tiers.forEach((tier) => {
        if (!tier.starts_at || !tier.ends_at) return;
        if (paidDate < tier.starts_at || paidDate > tier.ends_at) return;

        const key = `${groupId}:${tier.id}`;
        const row = rowMap.get(key) ?? {
          groupId,
          discountName: tier.label,
          entrants: 0,
          revenue: 0,
          startsAt: tier.starts_at,
          endsAt: tier.ends_at
        };
        row.entrants += 1;
        row.revenue += Number(entry.total_paid_entry ?? 0);
        rowMap.set(key, row);
      });
    });
  });

  const totalEntrantsByGroup = new Map<string, number>();
  const totalRevenueByGroup = new Map<string, number>();
  rowMap.forEach((row) => {
    totalEntrantsByGroup.set(row.groupId, (totalEntrantsByGroup.get(row.groupId) ?? 0) + row.entrants);
    totalRevenueByGroup.set(row.groupId, (totalRevenueByGroup.get(row.groupId) ?? 0) + row.revenue);
  });

  const rowsByGroupAndLabel = new Map<string, Map<string, EventRow>>();
  rowMap.forEach((row) => {
    if (!rowsByGroupAndLabel.has(row.groupId)) {
      rowsByGroupAndLabel.set(row.groupId, new Map());
    }
    rowsByGroupAndLabel.get(row.groupId)?.set(row.discountName, row);
  });

  const preferredOrder = [
    "Bloody Great Price",
    "Super Early Bird",
    "Early Bird",
    "Regular Price"
  ];

  const groupsByCity = new Map<string, EventGroup[]>();
  groupsForYears.forEach((group) => {
    const city = categoryById.get(group.event_category_id) ?? "Event";
    if (!groupsByCity.has(city)) {
      groupsByCity.set(city, []);
    }
    groupsByCity.get(city)?.push(group);
  });

  const citySections = Array.from(groupsByCity.entries())
    .map(([city, cityGroups]) => {
      const groupsWithTiers = cityGroups.filter((group) => (tiersByGroup.get(group.id) ?? []).length > 0);
      if (!groupsWithTiers.length) return null;
      const groupByYear = new Map<number, EventGroup>();
      groupsWithTiers.forEach((group) => {
        const yearValue = Number(group.year);
        if (!Number.isFinite(yearValue)) return;
        groupByYear.set(yearValue, group);
      });
      const labelSet = new Set<string>();
      groupsWithTiers.forEach((group) => {
        (tiersByGroup.get(group.id) ?? []).forEach((tier) => labelSet.add(tier.label));
      });
      const labels = Array.from(labelSet).sort((a, b) => {
        const aIndex = preferredOrder.indexOf(a);
        const bIndex = preferredOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      return { city, groupByYear, labels };
    })
    .filter((section): section is { city: string; groupByYear: Map<number, EventGroup>; labels: string[] } =>
      Boolean(section)
    )
    .sort((a, b) => a.city.localeCompare(b.city));

  const hasGroups = groupIds.length > 0;
  const hasDiscounts = discounts.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Discount Performance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Compare paid entrants across discount periods and years.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select up to 3 reporting years.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <select
                id="year"
                name="year"
                multiple
                size={Math.min(4, yearOptions.length)}
                defaultValue={selectedYearsSorted.map(String)}
                className="min-h-[120px] min-w-[160px] rounded-md border border-input bg-background/70 px-3 py-2 text-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple years.
              </p>
            </div>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      {!hasGroups ? (
        <Card>
          <CardHeader>
            <CardTitle>Discount Revenue</CardTitle>
            <CardDescription>
              Paid entrants per discount window for {selectedYearsLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No event groups found for the selected years.
            </p>
          </CardContent>
        </Card>
      ) : !hasDiscounts ? (
        <Card>
          <CardHeader>
            <CardTitle>Discount Revenue</CardTitle>
            <CardDescription>
              Paid entrants per discount window for {selectedYearsLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No discount tiers found for the selected years.
            </p>
          </CardContent>
        </Card>
      ) : citySections.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Discount Revenue</CardTitle>
            <CardDescription>
              Paid entrants per discount window for {selectedYearsLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No discount tiers available for the selected years.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {citySections.map((section) => (
            <Card key={section.city}>
              <CardHeader>
                <CardTitle>{section.city}</CardTitle>
                <CardDescription>
                  Discount tiers for {selectedYearsLabel}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead rowSpan={2}>Discount name</TableHead>
                      {selectedYearsSorted.map((year) => (
                        <TableHead key={year} colSpan={4} className="text-center">
                          {year}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      {selectedYearsSorted.map((year) => [
                        <TableHead key={`${year}-entrants`} className="text-right">
                          Entrants
                        </TableHead>,
                        <TableHead key={`${year}-percent`} className="text-right">
                          %
                        </TableHead>,
                        <TableHead key={`${year}-revenue`} className="text-right">
                          Revenue
                        </TableHead>,
                        <TableHead key={`${year}-revenue-ex`} className="text-right">
                          Revenue ex GST
                        </TableHead>
                      ])}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.labels.map((label) => (
                      <TableRow key={`${section.city}-${label}`}>
                        <TableCell>
                          <div className="text-sm font-medium">{label}</div>
                        </TableCell>
                        {selectedYearsSorted.map((year) => {
                          const group = section.groupByYear.get(year);
                          if (!group) {
                            return [
                              <TableCell key={`${year}-${label}-entrants`} className="text-right">
                                —
                              </TableCell>,
                              <TableCell key={`${year}-${label}-percent`} className="text-right">
                                —
                              </TableCell>,
                              <TableCell key={`${year}-${label}-revenue`} className="text-right">
                                —
                              </TableCell>,
                              <TableCell key={`${year}-${label}-revenue-ex`} className="text-right">
                                —
                              </TableCell>
                            ];
                          }
                          const row = rowsByGroupAndLabel.get(group.id)?.get(label);
                          const entrants = row?.entrants ?? 0;
                          const revenue = row?.revenue ?? 0;
                          const totalEntrants = totalEntrantsByGroup.get(group.id) ?? 0;
                          const percent = totalEntrants ? (entrants / totalEntrants) * 100 : 0;
                          return [
                            <TableCell key={`${year}-${label}-entrants`} className="text-right">
                              {entrants}
                            </TableCell>,
                            <TableCell key={`${year}-${label}-percent`} className="text-right">
                              {formatPercent(percent)}
                            </TableCell>,
                            <TableCell key={`${year}-${label}-revenue`} className="text-right">
                              {formatCurrency(revenue)}
                            </TableCell>,
                            <TableCell key={`${year}-${label}-revenue-ex`} className="text-right">
                              {formatCurrency(revenue / 1.1)}
                            </TableCell>
                          ];
                        })}
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>
                        <div className="text-sm font-semibold">Total</div>
                      </TableCell>
                      {selectedYearsSorted.map((year) => {
                        const group = section.groupByYear.get(year);
                        if (!group) {
                          return [
                            <TableCell key={`${year}-total-entrants`} className="text-right">
                              —
                            </TableCell>,
                            <TableCell key={`${year}-total-percent`} className="text-right">
                              —
                            </TableCell>,
                            <TableCell key={`${year}-total-revenue`} className="text-right">
                              —
                            </TableCell>,
                            <TableCell key={`${year}-total-revenue-ex`} className="text-right">
                              —
                            </TableCell>
                          ];
                        }
                        const totalEntrants = totalEntrantsByGroup.get(group.id) ?? 0;
                        const totalRevenue = totalRevenueByGroup.get(group.id) ?? 0;
                        const percent = totalEntrants ? 100 : 0;
                        return [
                          <TableCell key={`${year}-total-entrants`} className="text-right">
                            {totalEntrants}
                          </TableCell>,
                          <TableCell key={`${year}-total-percent`} className="text-right">
                            {formatPercent(percent)}
                          </TableCell>,
                          <TableCell key={`${year}-total-revenue`} className="text-right">
                            {formatCurrency(totalRevenue)}
                          </TableCell>,
                          <TableCell key={`${year}-total-revenue-ex`} className="text-right">
                            {formatCurrency(totalRevenue / 1.1)}
                          </TableCell>
                        ];
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
