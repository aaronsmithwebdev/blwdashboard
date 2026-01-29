import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type GroupSummary = {
  id: string;
  categoryName: string;
  year: number;
  totalDonations: number;
  totalEntries: number;
  mappedEvents: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0
  }).format(value);
}

const kpis = [
  { label: "Total Raised", detail: "Awaiting sync" },
  { label: "Active Events", detail: "Awaiting sync" },
  { label: "Avg. Gift", detail: "Awaiting sync" },
  { label: "New Donors", detail: "Awaiting sync" }
];

export default async function DashboardPage() {
  const supabase = createSupabaseAdminClient();

  const groupSummaryPromise = Promise.all([
    supabase.from("event_category").select("id, display_name"),
    supabase.from("event_group").select("id, event_category_id, year"),
    supabase
      .from("event_group_event")
      .select("event_group_id, event_id, include_in_reporting"),
    supabase.from("donations").select("event_id, d_amount"),
    supabase
      .from("event_entries")
      .select("event_id, history_id, is_paid, is_archived")
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
    event_id: number;
    include_in_reporting: boolean | null;
  }[];
  const donations = (donationsResult.data ?? []) as { event_id: number; d_amount: number | null }[];
  const entries = (entriesResult.data ?? []) as {
    event_id: number;
    history_id: number;
    is_paid: boolean | null;
    is_archived: boolean | null;
  }[];

  const categoryById = new Map(categories.map((category) => [category.id, category.display_name]));
  const groupById = new Map<string, GroupSummary>();
  groups.forEach((group) => {
    const categoryName = categoryById.get(group.event_category_id) ?? "Event";
    groupById.set(group.id, {
      id: group.id,
      categoryName,
      year: group.year,
      totalDonations: 0,
      totalEntries: 0,
      mappedEvents: 0
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

  donations.forEach((donation) => {
    if (!donation.event_id) return;
    const groupIds = eventToGroups.get(String(donation.event_id));
    if (!groupIds) return;
    const amount = Number(donation.d_amount ?? 0);
    groupIds.forEach((groupId) => {
      const group = groupById.get(groupId);
      if (group) {
        group.totalDonations += amount;
      }
    });
  });

  entries.forEach((entry) => {
    if (!entry.event_id) return;
    if (entry.is_paid !== true || entry.is_archived === true) return;
    const groupIds = eventToGroups.get(String(entry.event_id));
    if (!groupIds) return;
    groupIds.forEach((groupId) => {
      const group = groupById.get(groupId);
      if (group) {
        group.totalEntries += 1;
      }
    });
  });

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
          Monitor live event performance once Funraisin transactions are synced.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl">--</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{kpi.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Performance</CardTitle>
          <CardDescription>Fundraising totals by day (placeholder)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 rounded-lg border border-dashed border-border/80 bg-gradient-to-br from-white/70 via-background to-muted/60" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Group Revenue Summary</CardTitle>
          <CardDescription>Rollup of donations and paid entries by event and year.</CardDescription>
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
                  <TableHead>Mapped Events</TableHead>
                  <TableHead>Paid Entries</TableHead>
                  <TableHead>Total Donations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupSummaries.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.categoryName}</TableCell>
                    <TableCell>{group.year}</TableCell>
                    <TableCell>{group.mappedEvents}</TableCell>
                    <TableCell>{group.totalEntries}</TableCell>
                    <TableCell>{formatCurrency(group.totalDonations)}</TableCell>
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
