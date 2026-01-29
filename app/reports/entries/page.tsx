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

type EventEntry = {
  event_id: number | string | null;
  is_paid: boolean | string | number | null;
  date_paid: string | null;
  date_created: string | null;
};

function toSydneyYear(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("0000-00-00")) return null;
  const isoParsed = DateTime.fromISO(trimmed, { zone: "Australia/Sydney" });
  if (isoParsed.isValid) return isoParsed.year;
  const fallback = DateTime.fromFormat(trimmed, "yyyy-MM-dd HH:mm:ss", {
    zone: "Australia/Sydney"
  });
  if (fallback.isValid) return fallback.year;
  const dateOnly = DateTime.fromFormat(trimmed, "yyyy-MM-dd", { zone: "Australia/Sydney" });
  return dateOnly.isValid ? dateOnly.year : null;
}

export default async function EntriesReportPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createSupabaseAdminClient();
  const PAGE_SIZE = 1000;

  const nowYear = DateTime.now().setZone("Australia/Sydney").year;
  const paramYear = Array.isArray(searchParams?.year) ? searchParams?.year[0] : searchParams?.year;
  const parsedYear = paramYear ? Number(paramYear) : NaN;
  const selectedYear =
    Number.isFinite(parsedYear) && parsedYear > 2000 ? parsedYear : nowYear;

  const groupsResult = await supabase.from("event_group").select("id, year");
  if (groupsResult.error) {
    return <p className="text-sm text-red-600">{groupsResult.error.message}</p>;
  }

  const selectedYearKey = String(selectedYear);
  const groupsForYear = (groupsResult.data ?? []).filter(
    (group) => String(group.year).trim() === selectedYearKey
  );
  const groupIds = groupsForYear.map((group) => group.id);

  const mappingsResult = groupIds.length
    ? await supabase
        .from("event_group_event")
        .select("event_id, include_in_reporting")
        .in("event_group_id", groupIds)
    : { data: [], error: null };

  if (mappingsResult.error) {
    return <p className="text-sm text-red-600">{mappingsResult.error.message}</p>;
  }

  const mappedEventIds = Array.from(
    new Set(
      (mappingsResult.data ?? [])
        .filter((mapping) => mapping.include_in_reporting !== false)
        .map((mapping) => mapping.event_id)
        .filter((value) => value !== null && value !== undefined)
    )
  );

  const eventsResult = mappedEventIds.length
    ? await supabase
        .from("events")
        .select("event_id, event_name")
        .in("event_id", mappedEventIds)
    : { data: [], error: null };

  if (eventsResult.error) {
    return <p className="text-sm text-red-600">{eventsResult.error.message}</p>;
  }

  const events = (eventsResult.data ?? []) as {
    event_id: number | string;
    event_name: string | null;
  }[];

  const entries: EventEntry[] = [];
  let offset = 0;
  while (true) {
    let query = supabase
      .from("event_entries")
      .select("event_id, is_paid, date_paid, date_created")
      .range(offset, offset + PAGE_SIZE - 1);
    if (mappedEventIds.length > 0) {
      query = query.in("event_id", mappedEventIds);
    }

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

  const paidByEvent = new Map<string, number>();
  const paidByEventForYear = new Map<string, number>();
  const missingDateByEvent = new Map<string, number>();
  const eventNameById = new Map<string, string>();
  mappedEventIds.forEach((eventId) => {
    eventNameById.set(String(eventId), `Event ${eventId}`);
  });
  events.forEach((event) => {
    if (event.event_id === null || event.event_id === undefined) return;
    eventNameById.set(String(event.event_id), event.event_name ?? `Event ${event.event_id}`);
  });

  entries.forEach((entry) => {
    if (entry.event_id === null || entry.event_id === undefined) return;
    if (!coerceBoolean(entry.is_paid)) return;
    const eventKey = String(entry.event_id);
    paidByEvent.set(eventKey, (paidByEvent.get(eventKey) ?? 0) + 1);

    const year = toSydneyYear(entry.date_paid ?? entry.date_created);
    if (!year) {
      missingDateByEvent.set(eventKey, (missingDateByEvent.get(eventKey) ?? 0) + 1);
      return;
    }
    if (year !== selectedYear) return;
    paidByEventForYear.set(eventKey, (paidByEventForYear.get(eventKey) ?? 0) + 1);
  });

  const rows = Array.from(paidByEvent.entries())
    .map(([eventId, totalPaid]) => ({
      event_id: eventId,
      event_name: eventNameById.get(eventId) ?? `Event ${eventId}`,
      paid_entries: totalPaid,
      paid_entries_year: paidByEventForYear.get(eventId) ?? 0,
      missing_dates: missingDateByEvent.get(eventId) ?? 0
    }))
    .sort((a, b) => b.paid_entries - a.paid_entries);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Paid Entries by Event</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Debug view of paid entries per event for a given year.
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
              <input
                id="year"
                name="year"
                defaultValue={String(selectedYear)}
                className="h-10 min-w-[140px] rounded-md border border-input bg-background/70 px-3 text-sm"
              />
            </div>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paid Entries</CardTitle>
          <CardDescription>
            Paid entries for events mapped to the {selectedYear} event groups. The year column
            uses paid/created dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid entries found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Paid entries (all)</TableHead>
                  <TableHead className="text-right">Paid entries ({selectedYear})</TableHead>
                  <TableHead className="text-right">Missing dates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.event_id}>
                    <TableCell>{row.event_name}</TableCell>
                    <TableCell className="text-right">{row.paid_entries}</TableCell>
                    <TableCell className="text-right">{row.paid_entries_year}</TableCell>
                    <TableCell className="text-right">{row.missing_dates}</TableCell>
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
