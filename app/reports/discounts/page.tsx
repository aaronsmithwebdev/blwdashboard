import { DateTime } from "luxon";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { coerceBoolean } from "@/lib/utils/dates";

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
  discountKey: string;
  discountName: string;
  entrants: number;
  revenue: number;
  startsAt: string | null;
  endsAt: string | null;
};

type DiscountLabelMeta = {
  key: string;
  label: string;
  order: number;
};

const UNMATCHED_DISCOUNT_META: DiscountLabelMeta = {
  key: "unmatched",
  label: "Outside configured windows",
  order: 99
};

const DISCOUNT_LABEL_BUCKETS = [
  {
    key: "tier_1",
    label: "Bloody Great Price",
    order: 1,
    aliases: ["Bloody Great Price"]
  },
  {
    key: "tier_2",
    label: "Bloody Good Deal",
    order: 2,
    aliases: ["Super Early Bird", "Bloody Good Deal"]
  },
  {
    key: "tier_3",
    label: "Bloody Solid Saving",
    order: 3,
    aliases: ["Early Bird", "Bloody Solid Saving"]
  },
  {
    key: "tier_4",
    label: "Bloody Last Chance",
    order: 4,
    aliases: ["Regular Price", "Bloody Last Chance"]
  }
] as const;

function normalizeDiscountLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveDiscountLabelMeta(label: string): DiscountLabelMeta {
  const normalized = normalizeDiscountLabel(label);
  const bucket = DISCOUNT_LABEL_BUCKETS.find((entry) =>
    entry.aliases.some((alias) => normalizeDiscountLabel(alias) === normalized)
  );
  if (bucket) {
    return { key: bucket.key, label: bucket.label, order: bucket.order };
  }
  const fallbackLabel = label.trim() || "Discount";
  return {
    key: `custom:${normalized || fallbackLabel.toLowerCase()}`,
    label: fallbackLabel,
    order: 100
  };
}

function normalizeTierWindow(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) {
    return { startsAt, endsAt };
  }
  if (startsAt <= endsAt) {
    return { startsAt, endsAt };
  }
  return { startsAt: endsAt, endsAt: startsAt };
}

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

  const discounts = ((discountsResult.data ?? []) as DiscountTier[]).map((tier) => {
    const normalizedWindow = normalizeTierWindow(tier.starts_at, tier.ends_at);
    return {
      ...tier,
      starts_at: normalizedWindow.startsAt,
      ends_at: normalizedWindow.endsAt
    };
  });
  const mappings = (mappingsResult.data ?? []) as EventMapping[];

  const eventIds = Array.from(
    new Set(
      mappings
        .filter((mapping) => mapping.include_in_reporting !== false)
        .map((mapping) => mapping.event_id)
    )
  );

  const tiersByGroup = new Map<string, DiscountTier[]>();
  discounts.forEach((tier) => {
    if (!tiersByGroup.has(tier.event_group_id)) {
      tiersByGroup.set(tier.event_group_id, []);
    }
    tiersByGroup.get(tier.event_group_id)?.push(tier);
  });
  tiersByGroup.forEach((list) => list.sort((a, b) => (a.ends_at ?? "").localeCompare(b.ends_at ?? "")));

  let entries: EventEntry[] = [];
  if (eventIds.length) {
    for (const eventId of eventIds) {
      let lastHistoryId: number | null = null;

      while (true) {
        let entriesQuery = supabase
          .from("event_entries")
          .select("history_id, event_id, is_paid, date_paid, date_created, total_paid_entry")
          .eq("event_id", eventId)
          .order("history_id", { ascending: true })
          .limit(PAGE_SIZE);

        if (lastHistoryId !== null) {
          entriesQuery = entriesQuery.gt("history_id", lastHistoryId);
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

        lastHistoryId = batch[batch.length - 1]?.history_id ?? null;
        if (lastHistoryId === null) {
          break;
        }
      }
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
  const totalEntrantsByGroup = new Map<string, number>();
  const totalRevenueByGroup = new Map<string, number>();

  groupsForYears.forEach((group) => {
    const tiers = tiersByGroup.get(group.id) ?? [];
    tiers.forEach((tier) => {
      const key = `${group.id}:${tier.id}`;
      if (rowMap.has(key)) return;
      const labelMeta = resolveDiscountLabelMeta(tier.label);
      rowMap.set(key, {
        groupId: group.id,
        discountKey: labelMeta.key,
        discountName: labelMeta.label,
        entrants: 0,
        revenue: 0,
        startsAt: tier.starts_at,
        endsAt: tier.ends_at
      });
    });
  });

  entries.forEach((entry) => {
    if (!coerceBoolean(entry.is_paid)) return;
    if (entry.event_id === null || entry.event_id === undefined) return;
    const groupIdsForEvent = groupIdsByEvent.get(String(entry.event_id));
    if (!groupIdsForEvent) return;
    const paidDate = toSydneyDate(entry.date_paid ?? entry.date_created);
    const entryRevenue = Number(entry.total_paid_entry ?? 0);

    groupIdsForEvent.forEach((groupId) => {
      totalEntrantsByGroup.set(groupId, (totalEntrantsByGroup.get(groupId) ?? 0) + 1);
      totalRevenueByGroup.set(groupId, (totalRevenueByGroup.get(groupId) ?? 0) + entryRevenue);

      const tiers = tiersByGroup.get(groupId);
      if (!tiers || tiers.length === 0) return;

      const matchedTier =
        paidDate === null
          ? null
          : tiers.find((tier) => {
              if (!tier.starts_at || !tier.ends_at) return false;
              return paidDate >= tier.starts_at && paidDate <= tier.ends_at;
            }) ?? null;

      if (!matchedTier) {
        const key = `${groupId}:${UNMATCHED_DISCOUNT_META.key}`;
        const row = rowMap.get(key) ?? {
          groupId,
          discountKey: UNMATCHED_DISCOUNT_META.key,
          discountName: UNMATCHED_DISCOUNT_META.label,
          entrants: 0,
          revenue: 0,
          startsAt: null,
          endsAt: null
        };
        row.entrants += 1;
        row.revenue += entryRevenue;
        rowMap.set(key, row);
        return;
      }

      const key = `${groupId}:${matchedTier.id}`;
      const labelMeta = resolveDiscountLabelMeta(matchedTier.label);
      const row = rowMap.get(key) ?? {
        groupId,
        discountKey: labelMeta.key,
        discountName: labelMeta.label,
        entrants: 0,
        revenue: 0,
        startsAt: matchedTier.starts_at,
        endsAt: matchedTier.ends_at
      };
      row.entrants += 1;
      row.revenue += entryRevenue;
      rowMap.set(key, row);
    });
  });

  const rowsByGroupAndKey = new Map<string, Map<string, EventRow>>();
  rowMap.forEach((row) => {
    if (!rowsByGroupAndKey.has(row.groupId)) {
      rowsByGroupAndKey.set(row.groupId, new Map());
    }
    const byKey = rowsByGroupAndKey.get(row.groupId);
    if (!byKey) return;
    const existing = byKey.get(row.discountKey);
    if (!existing) {
      byKey.set(row.discountKey, { ...row });
      return;
    }
    existing.entrants += row.entrants;
    existing.revenue += row.revenue;
    existing.startsAt =
      [existing.startsAt, row.startsAt].filter(Boolean).sort()[0] ?? null;
    existing.endsAt =
      [existing.endsAt, row.endsAt].filter(Boolean).sort().reverse()[0] ?? null;
  });

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
      const labelByKey = new Map<string, DiscountLabelMeta>();
      groupsWithTiers.forEach((group) => {
        (tiersByGroup.get(group.id) ?? []).forEach((tier) => {
          const labelMeta = resolveDiscountLabelMeta(tier.label);
          if (!labelByKey.has(labelMeta.key)) {
            labelByKey.set(labelMeta.key, labelMeta);
          }
        });
        if (rowsByGroupAndKey.get(group.id)?.has(UNMATCHED_DISCOUNT_META.key)) {
          labelByKey.set(UNMATCHED_DISCOUNT_META.key, UNMATCHED_DISCOUNT_META);
        }
      });
      const labels = Array.from(labelByKey.values()).sort((a, b) => {
        if (a.order === b.order) return a.label.localeCompare(b.label);
        return a.order - b.order;
      });
      return { city, groupByYear, labels };
    })
    .filter((section): section is { city: string; groupByYear: Map<number, EventGroup>; labels: DiscountLabelMeta[] } =>
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
                        <TableHead key={year} colSpan={3} className="text-center">
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
                        </TableHead>
                      ])}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.labels.map((labelMeta) => (
                      <TableRow key={`${section.city}-${labelMeta.key}`}>
                        <TableCell>
                          <div className="text-sm font-medium">{labelMeta.label}</div>
                        </TableCell>
                        {selectedYearsSorted.map((year) => {
                          const group = section.groupByYear.get(year);
                          if (!group) {
                            return [
                              <TableCell key={`${year}-${labelMeta.key}-entrants`} className="text-right">
                                —
                              </TableCell>,
                              <TableCell key={`${year}-${labelMeta.key}-percent`} className="text-right">
                                —
                              </TableCell>,
                              <TableCell key={`${year}-${labelMeta.key}-revenue`} className="text-right">
                                —
                              </TableCell>
                            ];
                          }
                          const row = rowsByGroupAndKey.get(group.id)?.get(labelMeta.key);
                          const entrants = row?.entrants ?? 0;
                          const revenue = row?.revenue ?? 0;
                          const totalEntrants = totalEntrantsByGroup.get(group.id) ?? 0;
                          const percent = totalEntrants ? (entrants / totalEntrants) * 100 : 0;
                          return [
                            <TableCell key={`${year}-${labelMeta.key}-entrants`} className="text-right">
                              {entrants}
                            </TableCell>,
                            <TableCell key={`${year}-${labelMeta.key}-percent`} className="text-right">
                              {formatPercent(percent)}
                            </TableCell>,
                            <TableCell key={`${year}-${labelMeta.key}-revenue`} className="text-right">
                              {formatCurrency(revenue)}
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
