import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { coerceBoolean } from "@/lib/utils/dates";

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

export default async function DashboardPage() {
  const supabase = createSupabaseAdminClient();

  const groupSummaryPromise = Promise.all([
    supabase.from("event_category").select("id, display_name"),
    supabase.from("event_group").select("id, event_category_id, year"),
    supabase
      .from("event_group_event")
      .select("event_group_id, event_id, include_in_reporting"),
    supabase.from("donations").select("event_id, d_amount, d_refund_amount, d_status"),
    supabase
      .from("event_entries")
      .select("event_id, history_id, is_paid, is_archived, total_paid_entry")
  ]);

  const [
    categoriesResult,
    groupsResult,
    mappingsResult,
    donationsResult,
    entriesResult
  ] = await groupSummaryPromise;

  const summaryError =
    categoriesResult.error ||
    groupsResult.error ||
    mappingsResult.error ||
    donationsResult.error ||
    entriesResult.error;

  const categories = (categoriesResult.data ?? []) as { id: string; display_name: string }[];
  const groups = (groupsResult.data ?? []) as {
    id: string;
    event_category_id: string;
    year: number;
  }[];
  const mappings = (mappingsResult.data ?? []) as {
    event_group_id: string;
    event_id: number | string;
    include_in_reporting: boolean | null;
  }[];
  const donations = (donationsResult.data ?? []) as {
    event_id: number | string | null;
    d_amount: number | null;
    d_refund_amount: number | null;
    d_status: string | null;
  }[];
  const entries = (entriesResult.data ?? []) as {
    event_id: number | string | null;
    history_id: number;
    is_paid: boolean | string | number | null;
    is_archived: boolean | string | number | null;
    total_paid_entry: number | null;
  }[];

  const categoryById = new Map(categories.map((category) => [category.id, category.display_name]));
  const groupById = new Map<string, GroupSummary>();
  groups.forEach((group) => {
    const categoryName = categoryById.get(group.event_category_id) ?? "Event";
    groupById.set(group.id, {
      id: group.id,
      categoryName,
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
    const groupId = mapping.event_group_id;
    if (!groupId) return;
    const eventKey = String(mapping.event_id);
    if (!eventToGroups.has(eventKey)) {
      eventToGroups.set(eventKey, new Set());
    }
    eventToGroups.get(eventKey)?.add(groupId);
  });

  eventToGroups.forEach((groupIds) => {
    groupIds.forEach((groupId) => {
      const group = groupById.get(groupId);
      if (group) group.mappedEvents += 1;
    });
  });

  entries.forEach((entry) => {
    if (!entry.event_id) return;
    if (coerceBoolean(entry.is_archived) === true) return;
    const groupIds = eventToGroups.get(String(entry.event_id));
    if (!groupIds) return;
    const isPaid = coerceBoolean(entry.is_paid) === true;
    const revenueExGst = Number(entry.total_paid_entry ?? 0) / 1.1;
    groupIds.forEach((groupId) => {
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
    const groupIds = eventToGroups.get(String(donation.event_id));
    if (!groupIds) return;
    const amount = Number(donation.d_amount ?? 0) - Number(donation.d_refund_amount ?? 0);
    groupIds.forEach((groupId) => {
      const group = groupById.get(groupId);
      if (group) {
        group.totalDonations += amount;
      }
    });
  });

  groupById.forEach((group) => {
    group.unpaidEntrants = Math.max(group.allEntrants - group.paidEntrants, 0);
    group.donationsPerPaidEntrant =
      group.paidEntrants > 0 ? group.totalDonations / group.paidEntrants : null;
    group.donationsPerAllEntrant =
      group.allEntrants > 0 ? group.totalDonations / group.allEntrants : null;
  });

  let totalPaidEntrants = 0;
  let totalAllEntrants = 0;
  let totalEntryRevenueExGst = 0;
  let totalDonations = 0;

  const includedEventIds = new Set(eventToGroups.keys());
  entries.forEach((entry) => {
    if (!entry.event_id) return;
    if (!includedEventIds.has(String(entry.event_id))) return;
    if (coerceBoolean(entry.is_archived) === true) return;
    totalAllEntrants += 1;
    if (coerceBoolean(entry.is_paid) === true) {
      totalPaidEntrants += 1;
      totalEntryRevenueExGst += Number(entry.total_paid_entry ?? 0) / 1.1;
    }
  });
  donations.forEach((donation) => {
    if (!donation.event_id) return;
    if (!includedEventIds.has(String(donation.event_id))) return;
    if ((donation.d_status ?? "").toLowerCase() !== "paid") return;
    totalDonations += Number(donation.d_amount ?? 0) - Number(donation.d_refund_amount ?? 0);
  });
  const totalUnpaidEntrants = Math.max(totalAllEntrants - totalPaidEntrants, 0);

  const groupSummaries = Array.from(groupById.values()).sort((a, b) => {
    if (a.categoryName === b.categoryName) {
      return b.year - a.year;
    }
    return a.categoryName.localeCompare(b.categoryName);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live rollup of entrants, entry revenue, and donations.
        </p>
      </div>

      {summaryError ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-red-600">{summaryError.message}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Paid Entrants</CardDescription>
            <CardTitle className="text-2xl">{totalPaidEntrants.toLocaleString("en-AU")}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>All Entrants</CardDescription>
            <CardTitle className="text-2xl">{totalAllEntrants.toLocaleString("en-AU")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Includes paid and non-paid entrants.
            </p>
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
            <CardTitle className="text-2xl">{formatCurrency(totalEntryRevenueExGst)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Donations</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalDonations)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Donations Per Entrant</CardDescription>
            <CardTitle className="text-2xl">{formatRatio(totalDonations, totalPaidEntrants)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              All entrants basis: {formatRatio(totalDonations, totalAllEntrants)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Summary</CardTitle>
          <CardDescription>
            Paid vs all entrants, entry revenue ex GST, and donations by event/year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summaryError ? (
            <p className="text-sm text-red-600">{summaryError.message}</p>
          ) : groupSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add event groups and mappings to see revenue rollups.
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
