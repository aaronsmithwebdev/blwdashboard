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
  compare2?: string | string[];
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
  weeksBeforeEvent: number;
};

type ChartPoint = {
  weekIndex: number;
  weekLabel: string;
  primary: number | null;
  compare: number | null;
  compare2?: number | null;
  projection?: number | null;
};

type ChartMarker = {
  weekIndex: number;
  value: number;
  label: string;
  series: "primary" | "compare" | "event";
};

type WeightedComparisonSeries = {
  series: WeeklyPoint[];
  weight: number;
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
    return { series: [], total: 0, firstFriday: null, lastFriday: null, lastDataWeekIndex: null };
  }

  const minDate = paidDates.reduce((min, date) => (date < min ? date : min), paidDates[0]);
  const maxDate = paidDates.reduce((max, date) => (date > max ? date : max), paidDates[0]);
  const paddedStart = minDate.minus({ weeks: 1 });
  const paddedEnd = maxDate.plus({ weeks: 1 });
  const endLimitWithPadding = endLimitDate ? endLimitDate.plus({ weeks: 1 }) : null;
  const startDate =
    startLimitDate && startLimitDate > paddedStart ? startLimitDate : paddedStart;
  const endDate = endLimitWithPadding ?? paddedEnd;

  if (endDate < startDate) {
    return { series: [], total: 0, firstFriday: null, lastFriday: null };
  }

  const firstFriday = getWeekEndingFriday(startDate);
  const lastFriday = getWeekEndingFriday(endDate);
  const eventWeekEnding = endLimitDate ? getWeekEndingFriday(endLimitDate) : lastFriday;
  const lastDataFriday = getWeekEndingFriday(maxDate);
  const lastDataWeekIndex =
    Math.floor(Math.round(lastDataFriday.diff(firstFriday, "days").days) / 7) + 1;

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
    const weeksBeforeEvent = Math.round(
      eventWeekEnding.diff(friday, "days").days / 7
    );
    const weekLabel =
      weeksBeforeEvent === 0
        ? "Event"
        : weeksBeforeEvent < 0
          ? `${Math.abs(weeksBeforeEvent)}w after`
          : `${weeksBeforeEvent}w`;
    return {
      weekIndex: weeksBeforeEvent,
      weekLabel,
      value: cumulative,
      weekEnding: friday,
      weeksBeforeEvent
    };
  });

  const lastDataIndex = fridays.findIndex((friday) => friday.equals(lastDataFriday)) + 1;

  return {
    series,
    total: cumulative,
    firstFriday,
    lastFriday,
    lastDataWeekIndex: lastDataIndex > 0 ? lastDataIndex : null
  };
}

function getRegistrationStartDate(
  entries: EventEntry[],
  minRegistrations = 10
) {
  const paidDates = entries
    .filter((entry) => coerceBoolean(entry.is_paid) === true)
    .map((entry) => parseSydneyDate(entry.date_paid ?? entry.date_created))
    .filter((value): value is DateTime => Boolean(value));
  if (paidDates.length === 0) return null;
  const countByWeek = new Map<string, { weekEnding: DateTime; count: number }>();
  paidDates.forEach((date) => {
    const weekEnding = getWeekEndingFriday(date);
    const key = weekEnding.toISODate() ?? weekEnding.toISO();
    const entry = countByWeek.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      countByWeek.set(key, { weekEnding, count: 1 });
    }
  });
  const qualifyingWeeks = Array.from(countByWeek.values())
    .filter((week) => week.count >= minRegistrations)
    .sort((a, b) => a.weekEnding.toMillis() - b.weekEnding.toMillis());
  if (qualifyingWeeks.length === 0) return null;
  return qualifyingWeeks[0].weekEnding.minus({ weeks: 1 });
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
    return { series: [], total: 0, firstFriday: null, lastFriday: null, lastDataWeekIndex: null };
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
  const endLimitWithPadding = endLimitDate ? endLimitDate.plus({ weeks: 1 }) : null;
  const startDate =
    startLimitDate && startLimitDate > paddedStart ? startLimitDate : paddedStart;
  const endDate = endLimitWithPadding ?? paddedEnd;

  if (endDate < startDate) {
    return { series: [], total: 0, firstFriday: null, lastFriday: null };
  }

  const firstFriday = getWeekEndingFriday(startDate);
  const lastFriday = getWeekEndingFriday(endDate);
  const eventWeekEnding = endLimitDate ? getWeekEndingFriday(endLimitDate) : lastFriday;
  const lastDataFriday = getWeekEndingFriday(maxDate);
  const lastDataWeekIndex =
    Math.floor(Math.round(lastDataFriday.diff(firstFriday, "days").days) / 7) + 1;

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
    const weeksBeforeEvent = Math.round(
      eventWeekEnding.diff(friday, "days").days / 7
    );
    const weekLabel =
      weeksBeforeEvent === 0
        ? "Event"
        : weeksBeforeEvent < 0
          ? `${Math.abs(weeksBeforeEvent)}w after`
          : `${weeksBeforeEvent}w`;
    return {
      weekIndex: weeksBeforeEvent,
      weekLabel,
      value: cumulative,
      weekEnding: friday,
      weeksBeforeEvent
    };
  });

  const lastDataIndex = fridays.findIndex((friday) => friday.equals(lastDataFriday)) + 1;

  return {
    series,
    total: cumulative,
    firstFriday,
    lastFriday,
    lastDataWeekIndex: lastDataIndex > 0 ? lastDataIndex : null
  };
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
  eventDate: DateTime | null,
  validWeekIndexes: Set<number>,
  offsetDays = 0
) {
  const markersByIndex = new Map<number, string[]>();
  if (!eventDate) return markersByIndex;
  const eventWeekEnding = getWeekEndingFriday(eventDate.plus({ days: offsetDays }));

  discounts.forEach((discount) => {
    const endDate = parseSydneyDate(discount.ends_at);
    if (!endDate) return;
    const weekEnding = getWeekEndingFriday(endDate);
    const weekIndex = Math.round(eventWeekEnding.diff(weekEnding, "days").days / 7);
    if (!validWeekIndexes.has(weekIndex)) return;
    const label = discount.label?.trim() || "Price change";
    if (!markersByIndex.has(weekIndex)) {
      markersByIndex.set(weekIndex, []);
    }
    markersByIndex.get(weekIndex)?.push(label);
  });

  return markersByIndex;
}

function buildEventMarker(eventDate: DateTime | null, chartData: ChartPoint[]) {
  if (!eventDate) return null;
  const chartPoint = chartData.find((point) => point.weekIndex === 0);
  if (!chartPoint) return null;
  const value = chartPoint.primary ?? chartPoint.projection ?? null;
  if (value === null) return null;
  return {
    weekIndex: 0,
    value,
    label: "Event day",
    series: "event" as const
  };
}

function buildComparisonChartData(
  primarySeries: { series: WeeklyPoint[] },
  comparisonSeries: { series: WeeklyPoint[] } | null
) {
  const compareMap = new Map(
    (comparisonSeries?.series ?? []).map((point) => [point.weekIndex, point.value])
  );

  const chartData: ChartPoint[] = primarySeries.series.map((point) => {
    const compareValue = comparisonSeries ? compareMap.get(point.weekIndex) ?? null : null;
    return {
      weekIndex: point.weekIndex,
      weekLabel: point.weekLabel,
      primary: point.value,
      compare: compareValue
    };
  });

  return { chartData, compareMap };
}

function buildWeightedBaselineSeries(
  primarySeries: { series: WeeklyPoint[] },
  comparisons: WeightedComparisonSeries[]
) {
  if (comparisons.length === 0) {
    return {
      baseline: [] as Array<number | null>,
      baselineTotal: null as number | null
    };
  }

  const comparisonMaps = comparisons.map((comparison) => {
    const map = new Map(comparison.series.map((point) => [point.weekIndex, point.value]));
    return {
      ...comparison,
      map
    };
  });

  const baseline = primarySeries.series.map((point) => {
    let weightedSum = 0;
    let weightTotal = 0;
    comparisonMaps.forEach((comparison) => {
      const compareValue = comparison.map.get(point.weekIndex);
      if (compareValue === undefined || compareValue === null) return;
      weightedSum += compareValue * comparison.weight;
      weightTotal += comparison.weight;
    });
    if (weightTotal === 0) return null;
    return weightedSum / weightTotal;
  });

  const baselineTotal =
    [...baseline].reverse().find((value) => value !== null) ?? null;

  return { baseline, baselineTotal };
}

function buildMedianBaselineSeries(
  primarySeries: { series: WeeklyPoint[] },
  comparisons: WeightedComparisonSeries[]
) {
  if (comparisons.length === 0) {
    return {
      baseline: [] as Array<number | null>,
      baselineTotal: null as number | null
    };
  }

  const comparisonMaps = comparisons.map((comparison) => {
    const map = new Map(comparison.series.map((point) => [point.weekIndex, point.value]));
    return map;
  });

  const baseline = primarySeries.series.map((point) => {
    const values = comparisonMaps
      .map((map) => map.get(point.weekIndex))
      .filter((value): value is number => value !== null && value !== undefined)
      .sort((a, b) => a - b);
    if (values.length === 0) return null;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  });

  const baselineTotal =
    [...baseline].reverse().find((value) => value !== null) ?? null;

  return { baseline, baselineTotal };
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
  const compare2Param = Array.isArray(searchParams?.compare2)
    ? searchParams?.compare2[0]
    : searchParams?.compare2;
  const compare2ParamValue = compare2Param === "none" ? null : compare2Param;

  const offsetParam = Array.isArray(searchParams?.offset)
    ? searchParams?.offset[0]
    : searchParams?.offset;
  const parsedOffset = offsetParam ? Number(offsetParam) : null;

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
  const comparison2FallbackYear = comparisonGroup ? comparisonGroup.year - 1 : selectedGroup.year - 2;
  const comparison2Candidate = compare2ParamValue
    ? relatedGroups.find(
        (group) =>
          group.id === compare2ParamValue &&
          group.id !== selectedGroup.id &&
          group.id !== comparisonGroup?.id
      )
    : relatedGroups.find((group) => group.year === comparison2FallbackYear);
  const comparisonGroup2 = comparison2Candidate ?? null;

  let primaryEntries: EventEntry[] = [];
  let comparisonEntries: EventEntry[] = [];
  let comparison2Entries: EventEntry[] = [];
  let primaryDonations: DonationRow[] = [];
  let comparisonDonations: DonationRow[] = [];
  let comparison2Donations: DonationRow[] = [];
  let primaryEventDate: DateTime | null = null;
  let comparisonEventDate: DateTime | null = null;
  let comparison2EventDate: DateTime | null = null;
  let primaryCampaignStart: DateTime | null = null;
  let comparisonCampaignStart: DateTime | null = null;
  let comparison2CampaignStart: DateTime | null = null;
  let primaryDiscounts: DiscountRow[] = [];
  let comparisonDiscounts: DiscountRow[] = [];
  let comparisonOffsetDays = 0;
  const groupDataById = new Map<string, Awaited<ReturnType<typeof fetchGroupData>>>();
  try {
    const primaryData = await fetchGroupData(selectedGroup.id, supabase);
    groupDataById.set(selectedGroup.id, primaryData);
    primaryEntries = primaryData.entries;
    primaryDonations = primaryData.donations;
    primaryEventDate = getLatestEventDate(primaryData.events);
    primaryCampaignStart = primaryData.campaignStart;
    primaryDiscounts = primaryData.discounts;
    if (comparisonGroup) {
      const comparisonData = await fetchGroupData(comparisonGroup.id, supabase);
      groupDataById.set(comparisonGroup.id, comparisonData);
      comparisonEntries = comparisonData.entries;
      comparisonDonations = comparisonData.donations;
      comparisonEventDate = getLatestEventDate(comparisonData.events);
      comparisonCampaignStart = comparisonData.campaignStart;
      comparisonDiscounts = comparisonData.discounts;
    }
    if (comparisonGroup2) {
      const comparisonData2 = await fetchGroupData(comparisonGroup2.id, supabase);
      groupDataById.set(comparisonGroup2.id, comparisonData2);
      comparison2Entries = comparisonData2.entries;
      comparison2Donations = comparisonData2.donations;
      comparison2EventDate = getLatestEventDate(comparisonData2.events);
      comparison2CampaignStart = comparisonData2.campaignStart;
    }

    const projectionGroups = relatedGroups
      .filter((group) => group.year < selectedGroup.year)
      .sort((a, b) => b.year - a.year)
      .slice(0, 3);
    const projectionFetches = projectionGroups
      .filter((group) => !groupDataById.has(group.id))
      .map(async (group) => {
        const data = await fetchGroupData(group.id, supabase);
        groupDataById.set(group.id, data);
      });
    if (projectionFetches.length > 0) {
      await Promise.all(projectionFetches);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load entries.";
    return <p className="text-sm text-red-600">{message}</p>;
  }

  if (parsedOffset !== null && Number.isFinite(parsedOffset)) {
    comparisonOffsetDays = parsedOffset;
  } else {
    comparisonOffsetDays = 0;
  }

  const registrationStartDate = getRegistrationStartDate(primaryEntries, 10);
  const primarySeries = buildWeeklySeries(
    primaryEntries,
    primaryEventDate,
    registrationStartDate,
    projectionEnabled
  );
  const comparisonSeries = comparisonGroup
    ? buildWeeklySeries(
        comparisonEntries,
        comparisonEventDate ? comparisonEventDate.plus({ days: comparisonOffsetDays }) : null,
        getRegistrationStartDate(comparisonEntries, 10),
        true
      )
    : null;
  const comparisonSeries2 = comparisonGroup2
    ? buildWeeklySeries(
        comparison2Entries,
        comparison2EventDate ? comparison2EventDate.plus({ days: comparisonOffsetDays }) : null,
        getRegistrationStartDate(comparison2Entries, 10),
        true
      )
    : null;
  const { chartData: chartDataPrimaryCompare } = buildComparisonChartData(
    primarySeries,
    comparisonSeries
  );
  const chartDataCompare2 = comparisonGroup2
    ? buildComparisonChartData(primarySeries, comparisonSeries2).chartData
    : [];
  const chartData = chartDataPrimaryCompare.map((point, idx) => ({
    ...point,
    compare2: chartDataCompare2[idx]?.compare ?? null
  }));

  const weightedProjectionGroups = relatedGroups
    .filter((group) => group.year < selectedGroup.year)
    .sort((a, b) => b.year - a.year)
    .slice(0, 3);
  const projectionWeights = [0.6, 0.3, 0.1];
  const weightedComparisonSeries = weightedProjectionGroups
    .map((group, index) => {
      const data = groupDataById.get(group.id);
      if (!data) return null;
      const eventDate = getLatestEventDate(data.events);
      const series = buildWeeklySeries(
        data.entries,
        eventDate,
        getRegistrationStartDate(data.entries, 10),
        true
      );
      return {
        series: series.series,
        weight: projectionWeights[index] ?? 0
      } satisfies WeightedComparisonSeries;
    })
    .filter((value): value is WeightedComparisonSeries => Boolean(value) && value.weight > 0);

  const validWeekIndexes = new Set(primarySeries.series.map((point) => point.weekIndex));
  const primaryMarkerMap = buildDiscountMarkers(
    primaryDiscounts,
    primaryEventDate,
    validWeekIndexes
  );

  const compareMarkerMap = new Map<number, string[]>();
  if (comparisonGroup) {
    const compareMarkersByIndex = buildDiscountMarkers(
      comparisonDiscounts,
      comparisonEventDate,
      validWeekIndexes,
      comparisonOffsetDays
    );
    compareMarkersByIndex.forEach((labels, compareIndex) => {
      if (!compareMarkerMap.has(compareIndex)) {
        compareMarkerMap.set(compareIndex, []);
      }
      compareMarkerMap.get(compareIndex)?.push(...labels);
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
  const projectionWeeksBeforeEvent =
    projectionWeekEnding && primaryEventDate
      ? Math.round(
          getWeekEndingFriday(primaryEventDate).diff(projectionWeekEnding, "days").days / 7
        )
      : null;
  const primaryValueByWeek = new Map(
    primarySeries.series.map((point) => [point.weekIndex, point.value])
  );
  const projectionSeriesIndex =
    projectionWeeksBeforeEvent !== null
      ? primarySeries.series.findIndex((point) => point.weekIndex === projectionWeeksBeforeEvent)
      : -1;

  const weightedBaseline = buildWeightedBaselineSeries(primarySeries, weightedComparisonSeries);
  const baselineByWeek = new Map<number, number | null>(
    primarySeries.series.map((point, index) => [
      point.weekIndex,
      weightedBaseline.baseline[index] ?? null
    ])
  );
  let projectionTotal: number | null = null;
  let projectionScaleTotal = 1;
  let projectionScaleRecent = 1;
  let baselineAtProjection: number | null = null;
  if (
    projectionEnabled &&
    projectionWeeksBeforeEvent !== null &&
    weightedBaseline.baselineTotal !== null
  ) {
    const primaryAtDate = primaryValueByWeek.get(projectionWeeksBeforeEvent) ?? 0;
    baselineAtProjection = baselineByWeek.get(projectionWeeksBeforeEvent) ?? null;
    if (baselineAtProjection && baselineAtProjection > 0) {
      projectionScaleTotal = primaryAtDate / baselineAtProjection;
      projectionTotal = weightedBaseline.baselineTotal * projectionScaleTotal;
    }

    const recentWindow = 4;
    const recentStartIndex = Math.max(projectionSeriesIndex - recentWindow, 0);
    const primaryRecentStart = primarySeries.series[recentStartIndex]?.value ?? 0;
    const baselineRecentStart = weightedBaseline.baseline[recentStartIndex] ?? 0;
    const primaryRecentDelta = primaryAtDate - primaryRecentStart;
    const baselineRecentDelta =
      (baselineAtProjection ?? 0) - baselineRecentStart;
    if (baselineRecentDelta > 0) {
      projectionScaleRecent = primaryRecentDelta / baselineRecentDelta;
    }
  }

  let lastProjectionValue: number | null = null;
  const projectionRampWeeks = 3;
  const chartDataProjected = chartDataWithMarkers.map((point) => {
    if (!projectionEnabled || projectionWeeksBeforeEvent === null || projectionTotal === null) {
      return { ...point, projection: null };
    }
    if (point.weekIndex > projectionWeeksBeforeEvent) {
      return { ...point, projection: null };
    }
    const baselineValue = baselineByWeek.get(point.weekIndex) ?? null;
    if (
      baselineValue === null ||
      baselineAtProjection === null ||
      baselineAtProjection === 0
    ) {
      return {
        ...point,
        projection: null
      };
    }
    const clampedRecentScale = Math.min(Math.max(projectionScaleRecent, 0.6), 1.6);
    const baseProjection =
      (baselineValue - baselineAtProjection) * clampedRecentScale +
      (point.weekIndex === projectionWeeksBeforeEvent
        ? point.primary ?? 0
        : baselineAtProjection * projectionScaleTotal);
    const rampProgress =
      point.weeksBeforeEvent >= projectionWeeksBeforeEvent - projectionRampWeeks
        ? (projectionWeeksBeforeEvent - point.weeksBeforeEvent) / projectionRampWeeks
        : 1;
    const ramp = Math.min(Math.max(rampProgress, 0), 1);
    const blendedProjection =
      (point.primary ?? baseProjection) * (1 - ramp) + baseProjection * ramp;
    const actualAtProjection =
      point.weekIndex === projectionWeeksBeforeEvent ? point.primary ?? 0 : null;
    const adjustedProjection = Math.max(
      blendedProjection,
      lastProjectionValue ?? blendedProjection,
      actualAtProjection ?? blendedProjection
    );
    lastProjectionValue = adjustedProjection;
    return {
      ...point,
      primary: point.weekIndex < projectionWeeksBeforeEvent ? null : point.primary,
      projection: adjustedProjection
    };
  });
  const currentPrimaryIndex =
    projectionEnabled && projectionSeriesIndex >= 0
      ? projectionSeriesIndex + 1
      : primarySeries.lastDataWeekIndex ?? primarySeries.series.length;
  const currentPrimaryValue =
    primarySeries.series[currentPrimaryIndex - 1]?.value ?? primarySeries.total;
  const currentCompareValue = comparisonSeries
    ? chartDataProjected[currentPrimaryIndex - 1]?.compare ?? null
    : null;
  const currentCompare2Value = comparisonSeries2
    ? chartDataProjected[currentPrimaryIndex - 1]?.compare2 ?? null
    : null;

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
  const eventMarker = buildEventMarker(primaryEventDate, chartDataProjected);
  if (eventMarker) {
    markers.push(eventMarker);
  }

  const cityName = categoryById.get(selectedGroup.event_category_id) ?? "Event";
  const primaryLabel = String(selectedGroup.year);
  const compareLabel = comparisonGroup ? String(comparisonGroup.year) : null;
  const compare2Label = comparisonGroup2 ? String(comparisonGroup2.year) : null;
  const selectionGroups = orderedGroups.map((group) => ({
    id: group.id,
    categoryId: group.event_category_id,
    categoryName: categoryById.get(group.event_category_id) ?? "Event",
    year: group.year
  }));
  const selectedCompareId = comparisonGroup?.id ?? null;
  const selectedCompare2Id = comparisonGroup2?.id ?? null;
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
    ? buildDonationSeries(
        comparisonDonations,
        comparisonEventDate ? comparisonEventDate.plus({ days: comparisonOffsetDays }) : null,
        null,
        true
      )
    : null;
  const donationComparisonSeries2 = comparisonGroup2
    ? buildDonationSeries(
        comparison2Donations,
        comparison2EventDate ? comparison2EventDate.plus({ days: comparisonOffsetDays }) : null,
        null,
        true
      )
    : null;
  const donationChartPrimaryCompare = buildComparisonChartData(
    donationPrimarySeries,
    donationComparisonSeries
  ).chartData;
  const donationChartCompare2 = comparisonGroup2
    ? buildComparisonChartData(
        donationPrimarySeries,
        donationComparisonSeries2
      ).chartData
    : [];
  const donationChartData = donationChartPrimaryCompare.map((point, idx) => ({
    ...point,
    compare2: donationChartCompare2[idx]?.compare ?? null
  }));
  const weightedDonationSeries = weightedProjectionGroups
    .map((group, index) => {
      const data = groupDataById.get(group.id);
      if (!data) return null;
      const eventDate = getLatestEventDate(data.events);
      const series = buildDonationSeries(data.donations, eventDate, null, true);
      return {
        series: series.series,
        weight: projectionWeights[index] ?? 0
      } satisfies WeightedComparisonSeries;
    })
    .filter((value): value is WeightedComparisonSeries => Boolean(value) && value.weight > 0);
  const donationProjectionDate = projectionEnabled
    ? parseProjectionDate(projectionDateParam, selectedGroup.year)
    : null;
  const donationProjectionWeekEnding = donationProjectionDate
    ? getWeekEndingFriday(donationProjectionDate)
    : null;
  const donationProjectionWeeksBeforeEvent =
    donationProjectionWeekEnding && primaryEventDate
      ? Math.round(
          getWeekEndingFriday(primaryEventDate).diff(donationProjectionWeekEnding, "days").days / 7
        )
      : null;
  const donationProjectionIndex =
    donationProjectionWeeksBeforeEvent !== null
      ? donationPrimarySeries.series.findIndex(
          (point) => point.weekIndex === donationProjectionWeeksBeforeEvent
        )
      : -1;
  const weightedDonationBaseline = buildMedianBaselineSeries(
    donationPrimarySeries,
    weightedDonationSeries
  );
  const donationBaselineByWeek = new Map<number, number | null>(
    donationPrimarySeries.series.map((point, index) => [
      point.weekIndex,
      weightedDonationBaseline.baseline[index] ?? null
    ])
  );
  let donationProjectionTotal: number | null = null;
  let donationScaleTotal = 1;
  let donationScaleRecent = 1;
  let donationBaselineAtProjection: number | null = null;
  if (
    projectionEnabled &&
    donationProjectionWeeksBeforeEvent !== null &&
    weightedDonationBaseline.baselineTotal !== null
  ) {
    const primaryAtDate =
      donationPrimarySeries.series.find(
        (point) => point.weekIndex === donationProjectionWeeksBeforeEvent
      )?.value ?? 0;
    donationBaselineAtProjection = donationBaselineByWeek.get(donationProjectionWeeksBeforeEvent) ?? null;
    if (donationBaselineAtProjection && donationBaselineAtProjection > 0) {
      donationScaleTotal = primaryAtDate / donationBaselineAtProjection;
      donationProjectionTotal = weightedDonationBaseline.baselineTotal * donationScaleTotal;
    }

    const donationProjectionCapMultiplier = 1.1;
    const donationProjectionCap = weightedDonationBaseline.baselineTotal * donationProjectionCapMultiplier;
    if (donationProjectionTotal && donationProjectionTotal > donationProjectionCap) {
      donationProjectionTotal = donationProjectionCap;
    }

    const recentWindow = 4;
    const recentStartIndex = Math.max(donationProjectionIndex - recentWindow, 0);
    const primaryRecentStart = donationPrimarySeries.series[recentStartIndex]?.value ?? 0;
    const baselineRecentStart = weightedDonationBaseline.baseline[recentStartIndex] ?? 0;
    const primaryRecentDelta = primaryAtDate - primaryRecentStart;
    const baselineRecentDelta =
      (donationBaselineAtProjection ?? 0) - baselineRecentStart;
    if (baselineRecentDelta > 0) {
      donationScaleRecent = primaryRecentDelta / baselineRecentDelta;
    }
  }
  let lastDonationProjection: number | null = null;
  const donationProjectionRampWeeks = 3;
  const donationChartProjected = donationChartData.map((point) => {
    if (!projectionEnabled || donationProjectionWeeksBeforeEvent === null || donationProjectionTotal === null) {
      return { ...point, projection: null };
    }
    if (point.weekIndex > donationProjectionWeeksBeforeEvent) {
      return { ...point, projection: null };
    }
    const baselineValue = donationBaselineByWeek.get(point.weekIndex) ?? null;
    if (
      baselineValue === null ||
      donationBaselineAtProjection === null ||
      donationBaselineAtProjection === 0
    ) {
      return { ...point, projection: null };
    }
    const clampedRecentScale = Math.min(Math.max(donationScaleRecent, 0.8), 1.2);
    const baseProjection =
      (baselineValue - donationBaselineAtProjection) * clampedRecentScale +
      (point.weekIndex === donationProjectionWeeksBeforeEvent
        ? point.primary ?? 0
        : donationBaselineAtProjection * donationScaleTotal);
    const rampProgress =
      point.weeksBeforeEvent >= donationProjectionWeeksBeforeEvent - donationProjectionRampWeeks
        ? (donationProjectionWeeksBeforeEvent - point.weeksBeforeEvent) / donationProjectionRampWeeks
        : 1;
    const ramp = Math.min(Math.max(rampProgress, 0), 1);
    const blendedProjection =
      (point.primary ?? baseProjection) * (1 - ramp) + baseProjection * ramp;
    const actualAtProjection =
      point.weekIndex === donationProjectionWeeksBeforeEvent ? point.primary ?? 0 : null;
    const adjustedProjection = Math.max(
      blendedProjection,
      lastDonationProjection ?? blendedProjection,
      actualAtProjection ?? blendedProjection
    );
    lastDonationProjection = adjustedProjection;
    return {
      ...point,
      primary: point.weekIndex < donationProjectionWeeksBeforeEvent ? null : point.primary,
      projection: adjustedProjection
    };
  });
  const currentDonationIndex =
    projectionEnabled && donationProjectionIndex >= 0
      ? donationProjectionIndex + 1
      : donationPrimarySeries.lastDataWeekIndex ?? donationPrimarySeries.series.length;
  const currentDonationValue =
    donationPrimarySeries.series[currentDonationIndex - 1]?.value ?? donationPrimarySeries.total;
  const currentDonationCompareValue = donationComparisonSeries
    ? donationChartProjected[currentDonationIndex - 1]?.compare ?? null
    : null;
  const currentDonationCompare2Value = donationComparisonSeries2
    ? donationChartProjected[currentDonationIndex - 1]?.compare2 ?? null
    : null;
  const eventDateLabel = primaryEventDate
    ? primaryEventDate.toFormat("EEE d MMM yyyy")
    : "Event date TBD";
  const comparisonEventDateLabel = comparisonEventDate
    ? comparisonEventDate.toFormat("EEE d MMM yyyy")
    : null;
  const comparison2EventDateLabel = comparison2EventDate
    ? comparison2EventDate.toFormat("EEE d MMM yyyy")
    : null;
  const comparisonEventAlignedLabel =
    comparisonEventDate && comparisonOffsetDays !== 0
      ? comparisonEventDate.plus({ days: comparisonOffsetDays }).toFormat("EEE d MMM yyyy")
      : null;
  const comparison2EventAlignedLabel =
    comparison2EventDate && comparisonOffsetDays !== 0
      ? comparison2EventDate.plus({ days: comparisonOffsetDays }).toFormat("EEE d MMM yyyy")
      : null;
  const projectionDateLabel =
    projectionEnabled && projectionDate
      ? projectionDate.toFormat("EEE d MMM yyyy")
      : null;
  const donationMarkers: ChartMarker[] = [];
  const donationEventMarker = buildEventMarker(primaryEventDate, donationChartProjected);
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
            selectedCompare2Id={selectedCompare2Id}
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
              <div className="mt-1 text-xs text-muted-foreground">
                <span>{primaryLabel}: {eventDateLabel}</span>
                {compareLabel && comparisonEventDateLabel ? (
                  <span className="ml-3">
                    {compareLabel}: {comparisonEventDateLabel}
                    {comparisonEventAlignedLabel
                      ? ` (aligned ${comparisonEventAlignedLabel})`
                      : ""}
                  </span>
                ) : null}
                {compare2Label && comparison2EventDateLabel ? (
                  <span className="ml-3">
                    {compare2Label}: {comparison2EventDateLabel}
                    {comparison2EventAlignedLabel
                      ? ` (aligned ${comparison2EventAlignedLabel})`
                      : ""}
                  </span>
                ) : null}
              </div>
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
                {compare2Label ? (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(200_60%_55%)]" />
                    <span className="font-semibold text-foreground">{compare2Label}</span>
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
                {projectionEnabled
                  ? "Projected registrations"
                  : projectionDateLabel
                    ? `Registrations as of ${projectionDateLabel}`
                    : "Current registrations"}
              </p>
              <p className="text-2xl font-semibold">
                {projectionEnabled && projectionTotal !== null
                  ? Math.round(projectionTotal).toLocaleString("en-AU")
                  : currentPrimaryValue.toLocaleString("en-AU")}
              </p>
              {projectionEnabled ? (
                <p className="text-xs text-muted-foreground">
                  {projectionDateLabel
                    ? `As of ${projectionDateLabel}: `
                    : "As of now: "}
                  {currentPrimaryValue.toLocaleString("en-AU")}
                </p>
              ) : null}
              {projectionEnabled ? (
                <p className="text-xs text-muted-foreground">
                  {primaryLabel} total: {primarySeries.total.toLocaleString("en-AU")}
                </p>
              ) : null}
              {comparisonSeries ? (
                <p className="text-xs text-muted-foreground">
                  {compareLabel}:{" "}
                  {currentCompareValue !== null
                    ? currentCompareValue.toLocaleString("en-AU")
                    : comparisonSeries.total.toLocaleString("en-AU")}
                </p>
              ) : null}
              {comparisonSeries2 ? (
                <p className="text-xs text-muted-foreground">
                  {compare2Label}:{" "}
                  {currentCompare2Value !== null
                    ? currentCompare2Value.toLocaleString("en-AU")
                    : comparisonSeries2.total.toLocaleString("en-AU")}
                </p>
              ) : null}
              {projectionEnabled && comparisonSeries ? (
                <p className="text-xs text-muted-foreground">
                  {compareLabel} total: {comparisonSeries.total.toLocaleString("en-AU")}
                </p>
              ) : null}
              {projectionEnabled && comparisonSeries2 ? (
                <p className="text-xs text-muted-foreground">
                  {compare2Label} total: {comparisonSeries2.total.toLocaleString("en-AU")}
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
              compare2Label={compare2Label}
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
              <div className="mt-1 text-xs text-muted-foreground">
                <span>{primaryLabel}: {eventDateLabel}</span>
                {compareLabel && comparisonEventDateLabel ? (
                  <span className="ml-3">
                    {compareLabel}: {comparisonEventDateLabel}
                    {comparisonEventAlignedLabel
                      ? ` (aligned ${comparisonEventAlignedLabel})`
                      : ""}
                  </span>
                ) : null}
                {compare2Label && comparison2EventDateLabel ? (
                  <span className="ml-3">
                    {compare2Label}: {comparison2EventDateLabel}
                    {comparison2EventAlignedLabel
                      ? ` (aligned ${comparison2EventAlignedLabel})`
                      : ""}
                  </span>
                ) : null}
              </div>
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
                {compare2Label ? (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(200_60%_55%)]" />
                    <span className="font-semibold text-foreground">{compare2Label}</span>
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
                {projectionEnabled
                  ? "Projected donations"
                  : projectionDateLabel
                    ? `Donations as of ${projectionDateLabel}`
                    : "Current donations"}
              </p>
              <p className="text-2xl font-semibold">
                {projectionEnabled && donationProjectionTotal !== null
                  ? formatCurrency(donationProjectionTotal)
                  : formatCurrency(currentDonationValue)}
              </p>
              {projectionEnabled ? (
                <p className="text-xs text-muted-foreground">
                  {projectionDateLabel
                    ? `As of ${projectionDateLabel}: `
                    : "As of now: "}
                  {formatCurrency(currentDonationValue)}
                </p>
              ) : null}
              {projectionEnabled ? (
                <p className="text-xs text-muted-foreground">
                  {primaryLabel} total: {formatCurrency(donationPrimarySeries.total)}
                </p>
              ) : null}
              {donationComparisonSeries ? (
                <p className="text-xs text-muted-foreground">
                  {compareLabel}:{" "}
                  {currentDonationCompareValue !== null
                    ? formatCurrency(currentDonationCompareValue)
                    : formatCurrency(donationComparisonSeries.total)}
                </p>
              ) : null}
              {donationComparisonSeries2 ? (
                <p className="text-xs text-muted-foreground">
                  {compare2Label}:{" "}
                  {currentDonationCompare2Value !== null
                    ? formatCurrency(currentDonationCompare2Value)
                    : formatCurrency(donationComparisonSeries2.total)}
                </p>
              ) : null}
              {projectionEnabled && donationComparisonSeries ? (
                <p className="text-xs text-muted-foreground">
                  {compareLabel} total: {formatCurrency(donationComparisonSeries.total)}
                </p>
              ) : null}
              {projectionEnabled && donationComparisonSeries2 ? (
                <p className="text-xs text-muted-foreground">
                  {compare2Label} total: {formatCurrency(donationComparisonSeries2.total)}
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
              compare2Label={compare2Label}
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
