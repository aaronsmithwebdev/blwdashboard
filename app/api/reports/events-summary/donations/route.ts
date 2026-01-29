import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  donation_id: number | null;
  event_id: number | string | null;
  d_amount: number | null;
  d_refund_amount: number | null;
  d_status: string | null;
  donation_type: string | null;
  date_paid: string | null;
};

function csvEscape(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/\"/g, "\"\"")}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const parsedYear = yearParam ? Number(yearParam) : NaN;

  if (!Number.isFinite(parsedYear) || parsedYear < 2000) {
    return NextResponse.json({ error: "Invalid year." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const [groupsResult, categoriesResult] = await Promise.all([
    supabase.from("event_group").select("id, event_category_id, year"),
    supabase.from("event_category").select("id, display_name")
  ]);

  if (groupsResult.error) {
    return NextResponse.json({ error: groupsResult.error.message }, { status: 500 });
  }
  if (categoriesResult.error) {
    return NextResponse.json({ error: categoriesResult.error.message }, { status: 500 });
  }

  const groups = (groupsResult.data ?? []) as EventGroup[];
  const categories = (categoriesResult.data ?? []) as { id: string; display_name: string }[];
  const categoryById = new Map(categories.map((category) => [category.id, category.display_name]));
  const groupsForYear = groups.filter(
    (group) => Number(group.year) === parsedYear && categoryById.has(group.event_category_id)
  );

  if (groupsForYear.length === 0) {
    return NextResponse.json({ error: "No event groups found for year." }, { status: 404 });
  }

  const groupIds = groupsForYear.map((group) => group.id);
  const groupNameById = new Map<string, string>();
  groupsForYear.forEach((group) => {
    const name = categoryById.get(group.event_category_id) ?? `Event Group ${group.id}`;
    groupNameById.set(group.id, name);
  });

  const mappingsResult = await supabase
    .from("event_group_event")
    .select("event_group_id, event_id, include_in_reporting")
    .in("event_group_id", groupIds);

  if (mappingsResult.error) {
    return NextResponse.json({ error: mappingsResult.error.message }, { status: 500 });
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

  const PAGE_SIZE = 1000;
  const donations: DonationRow[] = [];
  if (mappedEventIds.length) {
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("donations")
        .select("donation_id, event_id, d_amount, d_refund_amount, d_status, donation_type, date_paid")
        .in("event_id", mappedEventIds)
        .eq("d_status", "paid")
        .neq("donation_type", "matched")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const batch = (data ?? []) as DonationRow[];
      donations.push(...batch);

      if (batch.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }
  }

  const lines = [
    [
      "event_group",
      "event_group_id",
      "event_id",
      "donation_id",
      "d_amount",
      "d_refund_amount",
      "net_amount",
      "d_status",
      "donation_type",
      "date_paid"
    ].join(",")
  ];

  donations.forEach((donation) => {
    if (donation.event_id === null || donation.event_id === undefined) return;
    const eventKey = String(donation.event_id);
    const groupIdsForEvent = groupIdsByEvent.get(eventKey);
    if (!groupIdsForEvent) return;
    const net = Number(donation.d_amount ?? 0) - Number(donation.d_refund_amount ?? 0);

    groupIdsForEvent.forEach((groupId) => {
      const row = [
        groupNameById.get(groupId) ?? `Event Group ${groupId}`,
        groupId,
        String(donation.event_id ?? ""),
        donation.donation_id !== null && donation.donation_id !== undefined
          ? String(donation.donation_id)
          : "",
        donation.d_amount !== null && donation.d_amount !== undefined ? String(donation.d_amount) : "",
        donation.d_refund_amount !== null && donation.d_refund_amount !== undefined
          ? String(donation.d_refund_amount)
          : "",
        String(net),
        donation.d_status ?? "",
        donation.donation_type ?? "",
        donation.date_paid ?? ""
      ].map((value) => csvEscape(value ?? ""));

      lines.push(row.join(","));
    });
  });

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"events-summary-donations-${parsedYear}.csv\"`
    }
  });
}
