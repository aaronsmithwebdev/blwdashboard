import Link from "next/link";
import { DateTime } from "luxon";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { coerceBoolean } from "@/lib/utils/dates";

const SYDNEY_ZONE = "Australia/Sydney";
const PAGE_SIZE = 1000;

type GroupSummary = {
  id: string;
  categoryName: string;
  year: number;
  mappedEvents: number;
  paidEntrants: number;
  allEntrants: number;
  unpaidEntrants: number;
  entryRevenueExGst: number;
  totalDonations: number;
  donationsPerPaidEntrant: number | null;
  donationsPerAllEntrant: number | null;
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

type DonationRow = {
  event_id: number | string | null;
  d_amount: number | null;
  d_refund_amount: number | null;
  d_status: string | null;
};

type EventEntryRow = {
  event_id: number | string | null;
  is_paid: boolean | string | number | null;
  is_archived: boolean | string | number | null;
  total_paid_entry: number | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatRatio(amount: number, count: number) {
  if (count <= 0) return "--";
  return formatCurrency(amount / count);
}

function normalizeEventIdsForQuery(eventIds: string[]) {
  return eventIds.map((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  });
}

export default async function DashboardPage() {
  const supabase = createSupabaseAdminClient();
  const currentYear = DateTime.now().setZone(SYDNEY_ZONE).year;

  const [categoriesResult, groupsResult] = await Promise.all([
    supabase.from("event_category").select("id, display_name"),
    supabase
      .from("event_group")
      .select("id, event_category_id, year")
      .eq("year", currentYear)
  ]);

  const baseError = categoriesResult.error || groupsResult.error;
  if (baseError) {
    return <p className="text-sm text-red-600">{baseError.message}</p>;
  }

  const categories = (categoriesResult.data ?? []) as { id: string; display_name: string }[];
  const groups = (groupsResult.data ?? []) as EventGroup[];
  const groupIds = groups.map((group) => group.id);

  const mappingsResult = groupIds.length
    ? await supabase
        .from("event_group_event")
        .select("event_group_id, event_id, include_in_reporting")
        .in("event_group_id", groupIds)
    : { data: [] as EventMapping[], error: null };

  if (mappingsResult.error) {
    return <p className="text-sm text-red-600">{mappingsResult.error.message}</p>;
  }

  const mappings = (mappingsResult.data ?? []) as EventMapping[];
  const categoryById = new Map(categories.map((category) => [category.id, category.display_name]));
  const groupById = new Map<string, GroupSummary>();
  groups.forEach((group) => {
    groupById.set(group.id, {
      id: group.id,
      categoryName: categoryById.get(group.event_category_id) ?? "Event",
      year: group.year,
      mappedEvents: 0,
      paidEntrants: 0,
      allEntrants: 0,
      unpaidEntrants: 0,
      entryRevenueExGst: 0,
      totalDonations: 0,
      donationsPerPaidEntrant: null,
      donationsPerAllEntrant: null
    });
  });

  const eventToGroups = new Map<string, Set<string>>();
  mappings.forEach((mapping) => {
    if (mapping.include_in_reporting === false) return;
    if (mapping.event_id === null || mapping.event_id === undefined) return;
    const groupId = mapping.event_group_id;
    if (!groupId) return;
    const eventKey = String(mapping.event_id);
    if (!eventToGroups.has(eventKey)) {
      eventToGroups.set(eventKey, new Set());
    }
    eventToGroups.get(eventKey)?.add(groupId);
  });

  eventToGroups.forEach((groupIdsForEvent) => {
    groupIdsForEvent.forEach((groupId) => {
      const group = groupById.get(groupId);
      if (group) {
        group.mappedEvents += 1;
      }
    });
  });

  const eventIdsForQuery = normalizeEventIdsForQuery(Array.from(eventToGroups.keys()));
  const entries: EventEntryRow[] = [];
  const donations: DonationRow[] = [];

  if (eventIdsForQuery.length > 0) {
    let entriesOffset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("event_entries")
        .select("event_id, is_paid, is_archived, total_paid_entry")
        .in("event_id", eventIdsForQuery)
        .range(entriesOffset, entriesOffset + PAGE_SIZE - 1);

      if (error) {
        return <p className="text-sm text-red-600">{error.message}</p>;
      }

      const batch = (data ?? []) as EventEntryRow[];
      entries.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      entriesOffset += PAGE_SIZE;
    }

    let donationsOffset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("donations")
        .select("event_id, d_amount, d_refund_amount, d_status")
        .in("event_id", eventIdsForQuery)
        .range(donationsOffset, donationsOffset + PAGE_SIZE - 1);

      if (error) {
        return <p className="text-sm text-red-600">{error.message}</p>;
      }

      const batch = (data ?? []) as DonationRow[];
      donations.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      donationsOffset += PAGE_SIZE;
    }
  }

  entries.forEach((entry) => {
    if (!entry.event_id) return;
    if (coerceBoolean(entry.is_archived) === true) return;
    const mappedGroups = eventToGroups.get(String(entry.event_id));
    if (!mappedGroups) return;
    const isPaid = coerceBoolean(entry.is_paid) === true;
    const revenueExGst = Number(entry.total_paid_entry ?? 0) / 1.1;
    mappedGroups.forEach((groupId) => {
      const group = groupById.get(groupId);
      if (!group) return;
      group.allEntrants += 1;
      if (isPaid) {
        group.paidEntrants += 1;
        group.entryRevenueExGst += revenueExGst;
      }
    });
  });

  donations.forEach((donation) => {
    if (!donation.event_id) return;
    if ((donation.d_status ?? "").toLowerCase() !== "paid") return;
    const mappedGroups = eventToGroups.get(String(donation.event_id));
    if (!mappedGroups) return;
    const netDonation = Number(donation.d_amount ?? 0) - Number(donation.d_refund_amount ?? 0);
    mappedGroups.forEach((groupId) => {
      const group = groupById.get(groupId);
      if (!group) return;
      group.totalDonations += netDonation;
    });
  });

  groupById.forEach((group) => {
    group.unpaidEntrants = Math.max(group.allEntrants - group.paidEntrants, 0);
    group.donationsPerPaidEntrant =
      group.paidEntrants > 0 ? group.totalDonations / group.paidEntrants : null;
    group.donationsPerAllEntrant =
      group.allEntrants > 0 ? group.totalDonations / group.allEntrants : null;
  });

  const groupSummaries = Array.from(groupById.values()).sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName)
  );

  const totals = groupSummaries.reduce(
    (acc, group) => {
      acc.paidEntrants += group.paidEntrants;
      acc.allEntrants += group.allEntrants;
      acc.entryRevenueExGst += group.entryRevenueExGst;
      acc.donations += group.totalDonations;
      return acc;
    },
    { paidEntrants: 0, allEntrants: 0, entryRevenueExGst: 0, donations: 0 }
  );
  const totalUnpaidEntrants = Math.max(totals.allEntrants - totals.paidEntrants, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live rollup for {currentYear} groups: entrants, entry revenue, and donations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Paid Entrants</CardDescription>
            <CardTitle className="text-2xl">{totals.paidEntrants.toLocaleString("en-AU")}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>All Entrants</CardDescription>
            <CardTitle className="text-2xl">{totals.allEntrants.toLocaleString("en-AU")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Includes paid and non-paid entrants.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Unpaid Entrants</CardDescription>
            <CardTitle className="text-2xl">{totalUnpaidEntrants.toLocaleString("en-AU")}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Entry Revenue (ex GST)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.entryRevenueExGst)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Donations</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totals.donations)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Donations Per Entrant</CardDescription>
            <CardTitle className="text-2xl">
              {formatRatio(totals.donations, totals.paidEntrants)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              All entrants basis: {formatRatio(totals.donations, totals.allEntrants)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Summary ({currentYear})</CardTitle>
          <CardDescription>
            Paid vs all entrants, entry revenue ex GST, and donations by event/year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groupSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No event groups found for {currentYear}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Mapped Events</TableHead>
                  <TableHead className="text-right">Paid Entrants</TableHead>
                  <TableHead className="text-right">All Entrants</TableHead>
                  <TableHead className="text-right">Unpaid Entrants</TableHead>
                  <TableHead className="text-right">Entry Revenue (ex GST)</TableHead>
                  <TableHead className="text-right">Donations</TableHead>
                  <TableHead className="text-right">Donations / Paid Entrant</TableHead>
                  <TableHead className="text-right">Donations / All Entrant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupSummaries.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <Link
                        href={`/events?group=${group.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {group.categoryName}
                      </Link>
                    </TableCell>
                    <TableCell>{group.year}</TableCell>
                    <TableCell className="text-right">{group.mappedEvents}</TableCell>
                    <TableCell className="text-right">{group.paidEntrants}</TableCell>
                    <TableCell className="text-right">{group.allEntrants}</TableCell>
                    <TableCell className="text-right">{group.unpaidEntrants}</TableCell>
                    <TableCell className="text-right">{formatCurrency(group.entryRevenueExGst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(group.totalDonations)}</TableCell>
                    <TableCell className="text-right">
                      {group.donationsPerPaidEntrant !== null
                        ? formatCurrency(group.donationsPerPaidEntrant)
                        : "--"}
                    </TableCell>
                    <TableCell className="text-right">
                      {group.donationsPerAllEntrant !== null
                        ? formatCurrency(group.donationsPerAllEntrant)
                        : "--"}
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
