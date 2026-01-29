import { DateTime } from "luxon";

import { RegistrationsAreaChart } from "@/components/charts/registrations-area-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { coerceBoolean } from "@/lib/utils/dates";
import { EventSelection } from "@/components/events/event-selection";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SYDNEY_ZONE = "Australia/Sydney";

type SearchParams = {
  group?: string | string[];
  compare?: string | string[];
  offset?: string | string[];
  projection?: string | string[];
  projectionDate?: string | string[];
};

type EventCategory = {
  id: string;
  display_name: string;
};

type EventGroup = {
  id: string;
  event_category_id: string;
  year: number;
};

type EventEntry = {
  event_id: number | string | null;
  date_created: string | null;
  date_paid: string | null;
  is_paid: boolean | string | number | null;
};

type DonationRow = {
  event_id: number | string | null;
  d_amount: number | null;
  d_refund_amount: number | null;
  d_status: string | null;
  donation_type: string | null;
  date_created: string | null;
  date_paid: string | null;
};

type EventDateRow = {
  event_id: number | string;
  event_date: string | null;
};

type DiscountRow = {
  label: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

type WeeklyPoint = {
  weekIndex: number;
  weekLabel: string;
  value: number;
  weekEnding: DateTime;
};

type ChartPoint = {
  weekIndex: number;
  weekLabel: string;
  primary: number | null;
  compare: number | null;
  projection?: number | null;
};

type ChartMarker = {
  weekIndex: number;
  value: number;
  label: string;
  series: "primary" | "compare" | "event";
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0
  }).format(value);
}

function parseSydneyDate(value: string | null) {
  if (!value) return null;
  const isoParsed = DateTime.fromISO(value, { zone: SYDNEY_ZONE });
  if (isoParsed.isValid) return isoParsed;
  const fallback = DateTime.fromFormat(value, "yyyy-MM-dd HH:mm:ss", { zone: SYDNEY_ZONE });
  return fallback.isValid ? fallback : null;
}

function getWeekEndingFriday(date: DateTime) {
  const daysToFriday = 5 - date.weekday;
  return date.plus({ days: daysToFriday }).startOf("day");
}

function buildWeeklySeries(
  entries: EventEntry[],
  endLimitDate?: DateTime | null,
  startLimitDate?: DateTime | null,
  _extendToEndDate = false
) {
  const paidDates = entries
    .filter((entry) => coerceBoolean(entry.is_paid) === true)
    .map((entry) => parseSydneyDate(entry.date_paid ?? entry.date_created))
    .filter((value): value is DateTime => Boolean(value));

  if (paidDates.length === 0) {
    return { series: [], total: 0, firstFriday: null, lastFriday: null };
  }

  const minDate = paidDates.reduce((min, date) => (date < min ? date : min), paidDates[0]);
  const maxDate = paidDates.reduce((max, date) => (date > max ? date : max), paidDates[0]);
  const paddedStart = minDate.minus({ weeks: 1 });
  const paddedEnd = maxDate.plus({ weeks: 1 });
  const startDate =
    startLimitDate && startLimitDate > paddedStart ? startLimitDate : paddedStart;
  const endDate = endLimitDate && endLimitDate > paddedEnd ? endLimitDate : paddedEnd;

  if (endDate < startDate) {
    return { series: [], total: 0, firstFriday: null, lastFriday: null };
  }

  const firstFriday = getWeekEndingFriday(startDate);
  const lastFriday = getWeekEndingFriday(endDate);

  const fridays: DateTime[] = [];
  let cursor = firstFriday;
  while (cursor <= lastFriday) {
    fridays.push(cursor);
    cursor = cursor.plus({ weeks: 1 });
  }

  const countByIndex = new Map<number, number>();
  paidDates.forEach((parsed) => {
    const weekEnding = getWeekEndingFriday(parsed);
    if (weekEnding < firstFriday || weekEnding > lastFriday) return;
    const diffDays = Math.round(weekEnding.diff(firstFriday, "days").days);
    const weekIndex = Math.floor(diffDays / 7) + 1;
    countByIndex.set(weekIndex, (countByIndex.get(weekIndex) ?? 0) + 1);
  });

  let cumulative = 0;
  const series: WeeklyPoint[] = fridays.map((friday, idx) => {
    const weekIndex = idx + 1;
    cumulative += countByIndex.get(weekIndex) ?? 0;
    return {
      weekIndex,
      weekLabel: friday.toFormat("MMM dd"),
      value: cumulative,
      weekEnding: friday
    };
  });

  return { series, total: cumulative, firstFriday, lastFriday };
}

function buildDonationSeries(
  donations: DonationRow[],
  endLimitDate?: DateTime | null,
  startLimitDate?: DateTime | null,
  _extendToEndDate = false
) {
  const donationPoints = donations
    .filter((donation) => donation.d_status === "paid")
    .filter((donation) => donation.donation_type !== "matched")
    .map((donation) => {
      const date = parseSydneyDate(donation.date_paid ?? donation.date_created);
      if (!date) return null;
      const amount = Number(donation.d_amount ?? 0) - Number(donation.d_refund_amount ?? 0);
      if (amount === 0) return null;
      return { date, amount };
    })
    .filter((value): value is { date: DateTime; amount: number } => Boolean(value));

  if (donationPoints.length === 0) {
    return { series: [], total: 0, firstFriday: null, lastFriday: null };
  }

  const minDate = donationPoints.reduce(
    (min, point) => (point.date < min ? point.date : min),
    donationPoints[0].date
  );
  const maxDate = donationPoints.reduce(
    (max, point) => (point.date > max ? point.date : max),
    donationPoints[0].date
  );
  const paddedStart = minDate.minus({ weeks: 1 });
  const paddedEnd = maxDate.plus({ weeks: 1 });
  const startDate =
    startLimitDate && startLimitDate > paddedStart ? startLimitDate : paddedStart;
  const endDate = endLimitDate && endLimitDate > paddedEnd ? endLimitDate : paddedEnd;

  if (endDate < startDate) {
    return { series: [], total: 0, firstFriday: null, lastFriday: null };
  }

  const firstFriday = getWeekEndingFriday(startDate);
  const lastFriday = getWeekEndingFriday(endDate);

  const fridays: DateTime[] = [];
  let cursor = firstFriday;
  while (cursor <= lastFriday) {
    fridays.push(cursor);
    cursor = cursor.plus({ weeks: 1 });
  }

  const amountByIndex = new Map<number, number>();
  donationPoints.forEach((point) => {
    const weekEnding = getWeekEndingFriday(point.date);
    if (weekEnding < firstFriday || weekEnding > lastFriday) return;
    const diffDays = Math.round(weekEnding.diff(firstFriday, "days").days);
    const weekIndex = Math.floor(diffDays / 7) + 1;
    amountByIndex.set(weekIndex, (amountByIndex.get(weekIndex) ?? 0) + point.amount);
  });

  let cumulative = 0;
  const series: WeeklyPoint[] = fridays.map((friday, idx) => {
    const weekIndex = idx + 1;
    cumulative += amountByIndex.get(weekIndex) ?? 0;
    return {
      weekIndex,
      weekLabel: friday.toFormat("MMM dd"),
      value: cumulative,
      weekEnding: friday
    };
  });

  return { series, total: cumulative, firstFriday, lastFriday };
}

function getLatestEventDate(events: EventDateRow[]) {
  const parsedDates = events
    .map((event) => parseSydneyDate(event.event_date))
    .filter((value): value is DateTime => Boolean(value));
  if (parsedDates.length === 0) return null;
  return parsedDates.reduce((max, date) => (date > max ? date : max), parsedDates[0]);
}

function buildDiscountMarkers(
  discounts: DiscountRow[],
  firstFriday: DateTime | null,
  lastFriday: DateTime | null
) {
  const markersByIndex = new Map<number, string[]>();
  if (!firstFriday || !lastFriday) return markersByIndex;

  discounts.forEach((discount) => {
    const endDate = parseSydneyDate(discount.ends_at);
    if (!endDate) return;
    const weekEnding = getWeekEndingFriday(endDate);
    if (weekEnding < firstFriday || weekEnding > lastFriday) return;
    const diffDays = Math.round(weekEnding.diff(firstFriday, "days").days);
    const weekIndex = Math.floor(diffDays / 7) + 1;
    const label = discount.label?.trim() || "Price change";
    if (!markersByIndex.has(weekIndex)) {
      markersByIndex.set(weekIndex, []);
    }
    markersByIndex.get(weekIndex)?.push(label);
  });

  return markersByIndex;
}

function buildEventMarker(
  eventDate: DateTime | null,
  chartData: ChartPoint[],
  firstFriday: DateTime | null
) {
  if (!eventDate || !firstFriday) return null;
  const eventWeekEnding = getWeekEndingFriday(eventDate);
  const diffDays = Math.round(eventWeekEnding.diff(firstFriday, "days").days);
  const weekIndex = Math.floor(diffDays / 7) + 1;
  if (weekIndex < 1) return null;
  const chartPoint = chartData.find((point) => point.weekIndex === weekIndex);
  if (!chartPoint) return null;
  const value = chartPoint.primary ?? chartPoint.projection ?? null;
  if (value === null) return null;
  return {
    weekIndex,
    value,
    label: "Event day",
    series: "event" as const
  };
}

function buildComparisonChartData(
  primarySeries: { series: WeeklyPoint[]; firstFriday: DateTime | null },
  comparisonSeries: { series: WeeklyPoint[]; firstFriday: DateTime | null } | null,
  comparisonOffsetDays: number,
  yearDelta: number
) {
  const compareMap = new Map(
    (comparisonSeries?.series ?? []).map((point) => [point.weekIndex, point.value])
  );
  const comparisonFirstFriday = comparisonSeries?.firstFriday ?? null;

  const chartData: ChartPoint[] = primarySeries.series.map((point) => {
    let compareValue: number | null = null;
    if (comparisonSeries && comparisonFirstFriday) {
      const targetDate = point.weekEnding
        .minus({ years: yearDelta })
        .plus({ days: comparisonOffsetDays });
      const diffDays = targetDate.startOf("day").diff(comparisonFirstFriday, "days").days;
      const compareIndex = Math.round(diffDays / 7) + 1;
      compareValue = compareMap.get(compareIndex) ?? null;
    }
    return {
      weekIndex: point.weekIndex,
      weekLabel: point.weekLabel,
      primary: point.value,
      compare: compareValue
    };
  });

  return { chartData, compareMap, comparisonFirstFriday };
}

function parseProjectionDate(value: string | null | undefined, targetYear: number) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const monthDayMatch = /^\d{2}-\d{2}$/.test(trimmed);
  if (!isoMatch && !monthDayMatch) return null;
  const isoDate = isoMatch ? trimmed : `${targetYear}-${trimmed}`;
  const parsed = DateTime.fromISO(isoDate, { zone: SYDNEY_ZONE });
  if (!parsed.isValid) return null;
  return parsed.set({ year: targetYear }).startOf("day");
}

async function fetchGroupData(
  groupId: string | null,
  supabase: ReturnType<typeof createSupabaseAdminClient>
) {
  if (!groupId) {
    return {
      entries: [] as EventEntry[],
      donations: [] as DonationRow[],
      events: [] as EventDateRow[],
      campaignStart: null as DateTime | null,
      discounts: [] as DiscountRow[]
    };
  }
  const mappingsResult = await supabase
    .from("event_group_event")
    .select("event_id, include_in_reporting")
    .eq("event_group_id", groupId);

  if (mappingsResult.error) {
    throw new Error(mappingsResult.error.message);
  }

  const eventIds = Array.from(
    new Set(
      (mappingsResult.data ?? [])
        .filter((mapping) => mapping.include_in_reporting !== false)
        .map((mapping) => mapping.event_id)
        .filter((value) => value !== null && value !== undefined)
    )
  );

  if (eventIds.length === 0) {
    return {
      entries: [] as EventEntry[],
      donations: [] as DonationRow[],
      events: [] as EventDateRow[],
      campaignStart: null as DateTime | null,
      discounts: [] as DiscountRow[]
    };
  }

  const [eventsResult, discountsResult] = await Promise.all([
    supabase.from("events").select("event_id, event_date").in("event_id", eventIds),
    supabase
      .from("event_group_discount")
      .select("label, starts_at, ends_at")
      .eq("event_group_id", groupId)
  ]);

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }
  if (discountsResult.error) {
    throw new Error(discountsResult.error.message);
  }

  const PAGE_SIZE = 1000;
  const entries: EventEntry[] = [];
  const donations: DonationRow[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("event_entries")
      .select("event_id, date_created, date_paid, is_paid")
      .in("event_id", eventIds)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const batch = (data ?? []) as EventEntry[];
    entries.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("donations")
      .select(
        "event_id, d_amount, d_refund_amount, d_status, donation_type, date_created, date_paid"
      )
      .in("event_id", eventIds)
      .eq("d_status", "paid")
      .neq("donation_type", "matched")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const batch = (data ?? []) as DonationRow[];
    donations.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const discounts = (discountsResult.data ?? []) as DiscountRow[];
  const campaignStart = discounts
    .map((discount) => parseSydneyDate(discount.starts_at))
    .filter((value): value is DateTime => Boolean(value))
    .sort((a, b) => a.toMillis() - b.toMillis())[0] ?? null;

  return {
    entries,
    donations,
    events: (eventsResult.data ?? []) as EventDateRow[],
    campaignStart,
    discounts
  };
}

function buildGroupLabel(group: EventGroup, categoryById: Map<string, string>) {
  const categoryName = categoryById.get(group.event_category_id) ?? "Event";
  return `${categoryName} ${group.year}`;
}

export default async function EventsPage({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = createSupabaseAdminClient();

  const [categoriesResult, groupsResult] = await Promise.all([
    supabase.from("event_category").select("id, display_name"),
    supabase.from("event_group").select("id, event_category_id, year")
  ]);

  if (categoriesResult.error) {
    return <p className="text-sm text-red-600">{categoriesResult.error.message}</p>;
  }

  if (groupsResult.error) {
    return <p className="text-sm text-red-600">{groupsResult.error.message}</p>;
  }

  const categories = (categoriesResult.data ?? []) as EventCategory[];
  const groups = (groupsResult.data ?? []) as EventGroup[];
  const categoryById = new Map(categories.map((category) => [category.id, category.display_name]));

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Event View</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Select an event group once you have synced events and mappings.
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              No event groups found. Create groups in Settings first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orderedGroups = [...groups].sort((a, b) => {
    if (a.year === b.year) {
      const nameA = categoryById.get(a.event_category_id) ?? "Event";
      const nameB = categoryById.get(b.event_category_id) ?? "Event";
      return nameA.localeCompare(nameB);
    }
    return b.year - a.year;
  });

  const groupParam = Array.isArray(searchParams?.group)
    ? searchParams?.group[0]
    : searchParams?.group;
  const selectedGroup = orderedGroups.find((group) => group.id === groupParam) ?? orderedGroups[0];

  const compareParam = Array.isArray(searchParams?.compare)
    ? searchParams?.compare[0]
    : searchParams?.compare;
  const compareParamValue = compareParam === "none" ? null : compareParam;

  const offsetParam = Array.isArray(searchParams?.offset)
    ? searchParams?.offset[0]
    : searchParams?.offset;
  const parsedOffset = offsetParam ? Number(offsetParam) : 0;
  const comparisonOffsetDays = Number.isFinite(parsedOffset) ? parsedOffset : 0;

  const projectionParam = Array.isArray(searchParams?.projection)
    ? searchParams?.projection[0]
    : searchParams?.projection;
  const projectionEnabled = ["1", "true", "on", "yes"].includes(
    String(projectionParam ?? "").toLowerCase()
  );
  const projectionDateParam = Array.isArray(searchParams?.projectionDate)
    ? searchParams?.projectionDate[0]
    : searchParams?.projectionDate;

  const relatedGroups = orderedGroups.filter(
    (group) => group.event_category_id === selectedGroup.event_category_id
  );
  const previousYearGroup = relatedGroups.find((group) => group.year === selectedGroup.year - 1);
  const comparisonCandidate = compareParamValue
    ? relatedGroups.find((group) => group.id === compareParamValue && group.id !== selectedGroup.id)
    : previousYearGroup;
  const comparisonGroup = comparisonCandidate ?? previousYearGroup ?? null;

  let primaryEntries: EventEntry[] = [];
  let comparisonEntries: EventEntry[] = [];
  let primaryDonations: DonationRow[] = [];
  let comparisonDonations: DonationRow[] = [];
  let primaryEventDate: DateTime | null = null;
  let comparisonEventDate: DateTime | null = null;
  let primaryCampaignStart: DateTime | null = null;
  let comparisonCampaignStart: DateTime | null = null;
  let primaryDiscounts: DiscountRow[] = [];
  let comparisonDiscounts: DiscountRow[] = [];
  try {
    const primaryData = await fetchGroupData(selectedGroup.id, supabase);
    primaryEntries = primaryData.entries;
    primaryDonations = primaryData.donations;
    primaryEventDate = getLatestEventDate(primaryData.events);
    primaryCampaignStart = primaryData.campaignStart;
    primaryDiscounts = primaryData.discounts;
    if (comparisonGroup) {
      const comparisonData = await fetchGroupData(comparisonGroup.id, supabase);
      comparisonEntries = comparisonData.entries;
      comparisonDonations = comparisonData.donations;
      comparisonEventDate = getLatestEventDate(comparisonData.events);
      comparisonCampaignStart = comparisonData.campaignStart;
      comparisonDiscounts = comparisonData.discounts;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load entries.";
    return <p className="text-sm text-red-600">{message}</p>;
  }

  const primarySeries = buildWeeklySeries(
    primaryEntries,
    primaryEventDate,
    primaryCampaignStart,
    projectionEnabled
  );
  const comparisonSeries = comparisonGroup
    ? buildWeeklySeries(
        comparisonEntries,
        comparisonEventDate,
        comparisonCampaignStart,
        true
      )
    : null;
  const yearDelta = comparisonGroup ? selectedGroup.year - comparisonGroup.year : 0;
  const { chartData } = buildComparisonChartData(
    primarySeries,
    comparisonSeries,
    comparisonOffsetDays,
    yearDelta
  );

  const primaryMarkerMap = buildDiscountMarkers(
    primaryDiscounts,
    primarySeries.firstFriday,
    primarySeries.lastFriday
  );

  const compareMarkerMap = new Map<number, string[]>();
  if (comparisonGroup && primarySeries.firstFriday && comparisonSeries?.firstFriday) {
    const compareMarkersByIndex = buildDiscountMarkers(
      comparisonDiscounts,
      comparisonSeries.firstFriday,
      comparisonSeries.lastFriday
    );
    compareMarkersByIndex.forEach((labels, compareIndex) => {
      const comparePoint = comparisonSeries?.series.find((point) => point.weekIndex === compareIndex);
      if (!comparePoint) return;
      const targetDate = comparePoint.weekEnding
        .plus({ years: yearDelta })
        .minus({ days: comparisonOffsetDays });
      const diffDays = Math.round(
        targetDate.startOf("day").diff(primarySeries.firstFriday, "days").days
      );
      const primaryIndex = Math.floor(diffDays / 7) + 1;
      if (!compareMarkerMap.has(primaryIndex)) {
        compareMarkerMap.set(primaryIndex, []);
      }
      compareMarkerMap.get(primaryIndex)?.push(...labels);
    });
  }

  const chartDataWithMarkers = chartData.map((point) => ({
    ...point,
    markersPrimary: primaryMarkerMap.get(point.weekIndex) ?? [],
    markersCompare: compareMarkerMap.get(point.weekIndex) ?? []
  }));

  const projectionDate = projectionEnabled
    ? parseProjectionDate(projectionDateParam, selectedGroup.year)
    : null;
  const projectionWeekEnding = projectionDate ? getWeekEndingFriday(projectionDate) : null;
  const projectionWeekIndex =
    projectionWeekEnding && primarySeries.firstFriday
      ? Math.floor(
          Math.round(projectionWeekEnding.diff(primarySeries.firstFriday, "days").days) / 7
        ) + 1
      : null;

  let projectionTotal: number | null = null;
  if (
    projectionEnabled &&
    projectionWeekIndex &&
    projectionWeekIndex >= 1 &&
    projectionWeekIndex <= primarySeries.series.length &&
    comparisonSeries &&
    comparisonSeries.series.length > 0
  ) {
    const comparisonTotal =
      comparisonSeries.series[comparisonSeries.series.length - 1]?.value ?? 0;
    const primaryAtDate = primarySeries.series[projectionWeekIndex - 1]?.value ?? 0;
    const compareAtDate = chartData[projectionWeekIndex - 1]?.compare ?? 0;
    if (comparisonTotal > 0 && compareAtDate > 0) {
      projectionTotal = (primaryAtDate / compareAtDate) * comparisonTotal;
    }
  }

  const chartDataProjected = chartDataWithMarkers.map((point) => {
    if (!projectionEnabled || !projectionWeekIndex || projectionTotal === null) {
      return { ...point, projection: null };
    }
    if (point.weekIndex < projectionWeekIndex) {
      return { ...point, projection: null };
    }
    const compareValue = point.compare ?? null;
    if (compareValue === null) {
      return {
        ...point,
        projection: null
      };
    }
    const comparisonTotal =
      comparisonSeries?.series[comparisonSeries.series.length - 1]?.value ?? 0;
    if (!comparisonTotal) {
      return { ...point, projection: null };
    }
    const projectedValue = (compareValue / comparisonTotal) * projectionTotal;
    return {
      ...point,
      primary: point.weekIndex > projectionWeekIndex ? null : point.primary,
      projection: projectedValue
    };
  });

  const markers = chartDataProjected.flatMap((point) => {
    const items: ChartMarker[] = [];
    point.markersPrimary.forEach((label) => {
      items.push({
        weekIndex: point.weekIndex,
        value: point.primary ?? point.projection ?? 0,
        label,
        series: "primary"
      });
    });
    if (point.compare !== null && point.compare !== undefined) {
      point.markersCompare.forEach((label) => {
        items.push({
          weekIndex: point.weekIndex,
          value: point.compare as number,
          label,
          series: "compare"
        });
      });
    }
    return items;
  });
  const eventMarker = buildEventMarker(
    primaryEventDate,
    chartDataProjected,
    primarySeries.firstFriday
  );
  if (eventMarker) {
    markers.push(eventMarker);
  }

  const cityName = categoryById.get(selectedGroup.event_category_id) ?? "Event";
  const primaryLabel = String(selectedGroup.year);
  const compareLabel = comparisonGroup ? String(comparisonGroup.year) : null;
  const selectionGroups = orderedGroups.map((group) => ({
    id: group.id,
    categoryId: group.event_category_id,
    categoryName: categoryById.get(group.event_category_id) ?? "Event",
    year: group.year
  }));
  const selectedCompareId = comparisonGroup?.id ?? null;
  const projectionInputValue = projectionDate
    ? projectionDate.toFormat("yyyy-MM-dd")
    : "";
  const donationPrimarySeries = buildDonationSeries(
    primaryDonations,
    primaryEventDate,
    null,
    projectionEnabled
  );
  const donationComparisonSeries = comparisonGroup
    ? buildDonationSeries(comparisonDonations, comparisonEventDate, null, true)
    : null;
  const donationChartData = buildComparisonChartData(
    donationPrimarySeries,
    donationComparisonSeries,
    comparisonOffsetDays,
    yearDelta
  ).chartData;
  const donationProjectionDate = projectionEnabled
    ? parseProjectionDate(projectionDateParam, selectedGroup.year)
    : null;
  const donationProjectionWeekEnding = donationProjectionDate
    ? getWeekEndingFriday(donationProjectionDate)
    : null;
  const donationProjectionWeekIndex =
    donationProjectionWeekEnding && donationPrimarySeries.firstFriday
      ? Math.floor(
          Math.round(
            donationProjectionWeekEnding.diff(donationPrimarySeries.firstFriday, "days").days
          ) / 7
        ) + 1
      : null;
  let donationProjectionTotal: number | null = null;
  if (
    projectionEnabled &&
    donationProjectionWeekIndex &&
    donationProjectionWeekIndex >= 1 &&
    donationProjectionWeekIndex <= donationPrimarySeries.series.length &&
    donationComparisonSeries &&
    donationComparisonSeries.series.length > 0
  ) {
    const comparisonTotal =
      donationComparisonSeries.series[donationComparisonSeries.series.length - 1]?.value ?? 0;
    const primaryAtDate =
      donationPrimarySeries.series[donationProjectionWeekIndex - 1]?.value ?? 0;
    const compareAtDate = donationChartData[donationProjectionWeekIndex - 1]?.compare ?? 0;
    if (comparisonTotal > 0 && compareAtDate > 0) {
      donationProjectionTotal = (primaryAtDate / compareAtDate) * comparisonTotal;
    }
  }
  const donationChartProjected = donationChartData.map((point) => {
    if (!projectionEnabled || !donationProjectionWeekIndex || donationProjectionTotal === null) {
      return { ...point, projection: null };
    }
    if (point.weekIndex < donationProjectionWeekIndex) {
      return { ...point, projection: null };
    }
    const compareValue = point.compare ?? null;
    if (compareValue === null) {
      return { ...point, projection: null };
    }
    const comparisonTotal =
      donationComparisonSeries?.series[donationComparisonSeries.series.length - 1]?.value ?? 0;
    if (!comparisonTotal) {
      return { ...point, projection: null };
    }
    const projectedValue = (compareValue / comparisonTotal) * donationProjectionTotal;
    return {
      ...point,
      primary: point.weekIndex > donationProjectionWeekIndex ? null : point.primary,
      projection: projectedValue
    };
  });
  const eventDateLabel = primaryEventDate
    ? primaryEventDate.toFormat("EEE d MMM yyyy")
    : "Event date TBD";
  const donationMarkers: ChartMarker[] = [];
  const donationEventMarker = buildEventMarker(
    primaryEventDate,
    donationChartProjected,
    donationPrimarySeries.firstFriday
  );
  if (donationEventMarker) {
    donationMarkers.push(donationEventMarker);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{cityName}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event selection</CardTitle>
          <CardDescription>Pick the event group and comparison year.</CardDescription>
        </CardHeader>
        <CardContent>
          <EventSelection
            groups={selectionGroups}
            selectedGroupId={selectedGroup.id}
            selectedCompareId={selectedCompareId}
            offsetDays={comparisonOffsetDays}
            projectionEnabled={projectionEnabled}
            projectionDate={projectionInputValue}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Registrations</CardTitle>
              <CardDescription>Cumulative registrations, weekly on Fridays.</CardDescription>
              <p className="mt-1 text-xs text-muted-foreground">Event date: {eventDateLabel}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
                  <span className="font-semibold text-foreground">{primaryLabel}</span>
                </div>
                {compareLabel ? (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
                    <span className="font-semibold text-foreground">{compareLabel}</span>
                  </div>
                ) : null}
                {projectionEnabled && projectionTotal !== null ? (
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-[hsl(var(--primary))]" />
                    <span className="font-semibold">Projection</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(140_60%_45%)]" />
                  <span>Event day</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(45_90%_55%)]" />
                  <span>Discount ends</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-white/80 px-4 py-2 text-right">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Current registrations
              </p>
              <p className="text-2xl font-semibold">
                {primarySeries.total.toLocaleString("en-AU")}
              </p>
              {projectionEnabled && projectionTotal !== null ? (
                <p className="text-xs text-muted-foreground">
                  Projected: {Math.round(projectionTotal).toLocaleString("en-AU")}
                </p>
              ) : null}
              {comparisonSeries ? (
                <p className="text-xs text-muted-foreground">
                  {compareLabel}: {comparisonSeries.total.toLocaleString("en-AU")}
                </p>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[60vh] min-h-[420px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/70">
              <p className="text-sm text-muted-foreground">No registrations found yet.</p>
            </div>
          ) : (
            <RegistrationsAreaChart
              data={chartDataProjected}
              primaryLabel={primaryLabel}
              compareLabel={compareLabel}
              markers={markers}
              projectionLabel={projectionEnabled && projectionTotal !== null ? "Projection" : null}
            />
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Donations</CardTitle>
              <CardDescription>Cumulative donations, weekly on Fridays.</CardDescription>
              <p className="mt-1 text-xs text-muted-foreground">Event date: {eventDateLabel}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
                  <span className="font-semibold text-foreground">{primaryLabel}</span>
                </div>
                {compareLabel ? (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
                    <span className="font-semibold text-foreground">{compareLabel}</span>
                  </div>
                ) : null}
                {projectionEnabled && donationProjectionTotal !== null ? (
                  <div className="flex items-center gap-2 text-foreground">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-[hsl(var(--primary))]" />
                    <span className="font-semibold">Projection</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(140_60%_45%)]" />
                  <span>Event day</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-white/80 px-4 py-2 text-right">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Current donations
              </p>
              <p className="text-2xl font-semibold">
                {formatCurrency(donationPrimarySeries.total)}
              </p>
              {projectionEnabled && donationProjectionTotal !== null ? (
                <p className="text-xs text-muted-foreground">
                  Projected: {formatCurrency(donationProjectionTotal)}
                </p>
              ) : null}
              {donationComparisonSeries ? (
                <p className="text-xs text-muted-foreground">
                  {compareLabel}: {formatCurrency(donationComparisonSeries.total)}
                </p>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[60vh] min-h-[420px]">
          {donationChartData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/70">
              <p className="text-sm text-muted-foreground">No donations found yet.</p>
            </div>
          ) : (
            <RegistrationsAreaChart
              data={donationChartProjected}
              primaryLabel={primaryLabel}
              compareLabel={compareLabel}
              markers={donationMarkers}
              projectionLabel={
                projectionEnabled && donationProjectionTotal !== null ? "Projection" : null
              }
              valueFormat="currency"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
