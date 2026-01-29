import { NextResponse } from "next/server";

import { createFunraisinClient } from "@/lib/funraisin/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { coerceBoolean, parseFunraisinDate, sleep, toNumber, toStringOrNull } from "@/lib/utils/dates";
import type { FunraisinEvent } from "@/lib/funraisin/types";

const PAGE_LIMIT = 1000;
const PAGE_DELAY_MS = 250;

const EVENT_FIELDS = [
  "event_id",
  "event_name",
  "event_date",
  "event_key",
  "event_code",
  "event_status",
  "event_type",
  "event_city",
  "event_state",
  "event_country",
  "event_location",
  "event_target",
  "event_closed",
  "event_expiry",
  "date_created",
  "last_updated",
  "raw"
];

function normalizeDate(value: unknown) {
  const str = toStringOrNull(value);
  if (!str || str === "0000-00-00" || str === "0000-00-00 00:00:00") {
    return null;
  }
  return str;
}

function mapEvent(event: FunraisinEvent) {
  const eventId = toNumber(event.event_id ?? event.id ?? event.eventId);
  if (eventId === null) {
    return null;
  }

  const eventDate = normalizeDate(event.event_date);
  const eventExpiry = normalizeDate(event.event_expiry);
  const dateCreated = normalizeDate(event.date_created);
  const lastUpdated = normalizeDate(event.last_updated);

  return {
    event_id: eventId,
    event_name: toStringOrNull(event.event_name ?? event.name),
    event_date: eventDate,
    event_key: toStringOrNull(event.event_key),
    event_code: toStringOrNull(event.event_code),
    event_status: toStringOrNull(event.event_status ?? event.status),
    event_type: toStringOrNull(event.event_type),
    event_city: toStringOrNull(event.event_city),
    event_state: toStringOrNull(event.event_state),
    event_country: toStringOrNull(event.event_country),
    event_location: toStringOrNull(event.event_location),
    event_target: toNumber(event.event_target),
    event_closed: coerceBoolean(event.event_closed),
    event_expiry: eventExpiry,
    date_created: parseFunraisinDate(dateCreated),
    last_updated: parseFunraisinDate(lastUpdated),
    raw: event
  };
}

function pickFields<T extends Record<string, unknown>>(row: T, allowed: string[]) {
  const picked: Record<string, unknown> = {};
  for (const key of allowed) {
    if (row[key] !== undefined) {
      picked[key] = row[key];
    }
  }
  return picked;
}

export async function POST() {
  let funraisin: ReturnType<typeof createFunraisinClient>;
  let supabase: ReturnType<typeof createSupabaseAdminClient>;

  try {
    funraisin = createFunraisinClient();
    supabase = createSupabaseAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to initialize services." },
      { status: 500 }
    );
  }

  let offset = 0;
  let pagesFetched = 0;
  let rowsUpserted = 0;
  const errors: string[] = [];
  let failed = false;

  try {
    while (true) {
      const response = await funraisin.fetchEvents({ limit: PAGE_LIMIT, offset });
      const events = response.events ?? response.data ?? response.result ?? (response as unknown as FunraisinEvent[]);

      if (!Array.isArray(events) || events.length === 0) {
        break;
      }

      pagesFetched += 1;

      const mapped = events.map(mapEvent).filter(Boolean) as ReturnType<typeof mapEvent>[];
      const skipped = events.length - mapped.length;
      if (skipped > 0) {
        errors.push(`Skipped ${skipped} events without event_id.`);
      }

      if (mapped.length > 0) {
        const payload = mapped.map((row) => pickFields(row, EVENT_FIELDS));
        const { error } = await supabase
          .from("events")
          .upsert(payload, { onConflict: "event_id" });

        if (error) {
          failed = true;
          errors.push(error.message);
        } else {
          rowsUpserted += payload.length;
        }
      }

      offset += PAGE_LIMIT;

      if (events.length < PAGE_LIMIT) {
        break;
      }

      await sleep(PAGE_DELAY_MS);
    }
  } catch (err) {
    failed = true;
    errors.push(err instanceof Error ? err.message : "Unknown sync error.");
  }

  const status = failed ? "failed" : "success";
  const ingestRecord = {
    endpoint: "events",
    since_ts: null,
    until_ts: null,
    rows_upserted: rowsUpserted,
    status,
    error: errors.length ? errors.join(" | ") : null
  };

  const { error: ingestError } = await supabase.from("fr_ingest_run").insert(ingestRecord);
  if (ingestError) {
    failed = true;
    errors.push(ingestError.message);
  }

  return NextResponse.json(
    {
      pagesFetched,
      rowsUpserted,
      lastOffset: offset,
      errors,
      error: failed ? errors[0] ?? "Sync failed." : undefined
    },
    { status: failed ? 500 : 200 }
  );
}
