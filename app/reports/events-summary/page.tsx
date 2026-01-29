import { DateTime } from "luxon";

import { Button, buttonVariants } from "@/components/ui/button";
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

type EventMapping = {
  event_group_id: string;
  event_id: number | string | null;
  include_in_reporting: boolean | null;
};

type EventEntry = {
  event_id: number | string | null;
  is_paid: boolean | string | number | null;
  total_paid_entry: number | null;
};

type Donation = {
  event_id: number | string | null;
  d_amount: number | null;
  d_refund_amount: number | null;
  d_status: string | null;
  donation_type: string | null;
};

type GroupRow = {
  group_id: string;
  group_name: string;
  entrants: number;
  total_paid_entry_ex_gst: number;
  total_donations: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2
  }).format(value);
}

export default async function EventsSummaryReportPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createSupabaseAdminClient();
  const PAGE_SIZE = 1000;

  const nowYear = DateTime.now().setZone("Australia/Sydney").year;
  const paramYear = Array.isArray(searchParams?.year) ? searchParams?.year[0] : searchParams?.year;
  const parsedYear = paramYear ? Number(paramYear) : NaN;

  const [groupsResult, categoriesResult] = await Promise.all([
    supabase.from("event_group").select("id, event_category_id, year"),
    supabase.from("event_category").select("id, display_name")
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
  const groupsWithCategory = groups.filter((group) => categoryById.has(group.event_category_id));
  const availableYears = Array.from(
    new Set(
      groupsWithCategory
        .map((group) => Number(group.year))
        .filter((year) => Number.isFinite(year))
    )
  ).sort((a, b) => b - a);

  const selectedYear = Number.isFinite(parsedYear) && parsedYear > 2000
    ? parsedYear
    : availableYears.includes(nowYear)
      ? nowYear
      : availableYears[0] ?? nowYear;

  const yearOptions = Array.from(new Set([selectedYear, nowYear, ...availableYears])).sort(
    (a, b) => b - a
  );

  const groupsForYear = groupsWithCategory.filter((group) => Number(group.year) === selectedYear);
  const groupIds = groupsForYear.map((group) => group.id);
  const groupNameById = new Map<string, string>();
  groupsForYear.forEach((group) => {
    const name = categoryById.get(group.event_category_id) ?? `Event Group ${group.id}`;
    groupNameById.set(group.id, name);
  });

  const mappingsResult = groupIds.length
    ? await supabase
        .from("event_group_event")
        .select("event_group_id, event_id, include_in_reporting")
        .in("event_group_id", groupIds)
    : { data: [], error: null };

  if (mappingsResult.error) {
    return <p className="text-sm text-red-600">{mappingsResult.error.message}</p>;
  }

  const mappedEventIds = Array.from(
    new Set(
      (mappingsResult.data ?? [])
        .filter((mapping: EventMapping) => mapping.include_in_reporting !== false)
        .map((mapping) => mapping.event_id)
        .filter((eventId): eventId is string | number => eventId !== null && eventId !== undefined)
    )
  );

  const groupIdsByEvent = new Map<string, string[]>();
  (mappingsResult.data ?? []).forEach((mapping: EventMapping) => {
    if (mapping.include_in_reporting === false) return;
    if (mapping.event_id === null || mapping.event_id === undefined) return;
    if (!groupIds.includes(mapping.event_group_id)) return;
    const eventKey = String(mapping.event_id);
    if (!groupIdsByEvent.has(eventKey)) {
      groupIdsByEvent.set(eventKey, []);
    }
    groupIdsByEvent.get(eventKey)?.push(mapping.event_group_id);
  });

  const entries: EventEntry[] = [];
  if (mappedEventIds.length) {
    let offset = 0;
    while (true) {
      let query = supabase
        .from("event_entries")
        .select("event_id, is_paid, total_paid_entry")
        .in("event_id", mappedEventIds)
        .range(offset, offset + PAGE_SIZE - 1);

      const { data, error } = await query;
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

  const donations: Donation[] = [];
  if (mappedEventIds.length) {
    let offset = 0;
    while (true) {
      let query = supabase
        .from("donations")
        .select("event_id, d_amount, d_refund_amount, d_status, donation_type")
        .in("event_id", mappedEventIds)
        .eq("d_status", "paid")
        .neq("donation_type", "matched")
        .range(offset, offset + PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) {
        return <p className="text-sm text-red-600">{error.message}</p>;
      }

      const batch = (data ?? []) as Donation[];
      donations.push(...batch);

      if (batch.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }
  }

  const paidRevenueByGroup = new Map<string, number>();
  const entrantCountByGroup = new Map<string, number>();
  const donationByGroup = new Map<string, number>();

  entries.forEach((entry) => {
    if (entry.event_id === null || entry.event_id === undefined) return;
    if (!coerceBoolean(entry.is_paid)) return;
    const eventKey = String(entry.event_id);
    const groupIdsForEvent = groupIdsByEvent.get(eventKey);
    if (!groupIdsForEvent) return;
    const amount = Number(entry.total_paid_entry ?? 0);
    groupIdsForEvent.forEach((groupId) => {
      paidRevenueByGroup.set(groupId, (paidRevenueByGroup.get(groupId) ?? 0) + amount);
      entrantCountByGroup.set(groupId, (entrantCountByGroup.get(groupId) ?? 0) + 1);
    });
  });

  donations.forEach((donation) => {
    if (donation.event_id === null || donation.event_id === undefined) return;
    const eventKey = String(donation.event_id);
    const groupIdsForEvent = groupIdsByEvent.get(eventKey);
    if (!groupIdsForEvent) return;
    const amount = Number(donation.d_amount ?? 0) - Number(donation.d_refund_amount ?? 0);
    groupIdsForEvent.forEach((groupId) => {
      donationByGroup.set(groupId, (donationByGroup.get(groupId) ?? 0) + amount);
    });
  });

  const rows: GroupRow[] = groupsForYear.map((group) => {
    const totalPaid = paidRevenueByGroup.get(group.id) ?? 0;
    const totalDonations = donationByGroup.get(group.id) ?? 0;
    return {
      group_id: group.id,
      group_name: groupNameById.get(group.id) ?? `Event Group ${group.id}`,
      entrants: entrantCountByGroup.get(group.id) ?? 0,
      total_paid_entry_ex_gst: totalPaid / 1.1,
      total_donations: totalDonations
    };
  });

  rows.sort((a, b) => b.entrants - a.entrants);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Events Summary</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revenue rollup for paid entries and donations by event group.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select a reporting year.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <select
                id="year"
                name="year"
                defaultValue={String(selectedYear)}
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
            <a
              href={`/api/reports/events-summary/donations?year=${selectedYear}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Download donation IDs
            </a>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
        <CardTitle>Event Group Summary</CardTitle>
          <CardDescription>
            Paid entry revenue and donations for events mapped to the {selectedYear} event groups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No event groups found for the selected year.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Group</TableHead>
                  <TableHead className="text-right">Entrants</TableHead>
                  <TableHead className="text-right">Registration revenue (ex GST)</TableHead>
                  <TableHead className="text-right">Total donation amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.group_id}>
                    <TableCell>{row.group_name}</TableCell>
                    <TableCell className="text-right">
                      {row.entrants.toLocaleString("en-AU")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.total_paid_entry_ex_gst)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.total_donations)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
