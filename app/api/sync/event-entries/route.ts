import { NextResponse } from "next/server";

import { createFunraisinClient } from "@/lib/funraisin/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  coerceBoolean,
  parseDateOnly,
  parseFunraisinDate,
  sleep,
  toNumber,
  toStringOrNull,
  toSydneyISOEnd,
  toSydneyISOStart
} from "@/lib/utils/dates";
import type { FunraisinParticipantEvent } from "@/lib/funraisin/types";

const PAGE_LIMIT = 1000;
const PAGE_DELAY_MS = 250;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function mapParticipantEvent(entry: FunraisinParticipantEvent) {
  const historyId = toNumber(entry.history_id);
  if (historyId === null) {
    return null;
  }

  return {
    history_id: historyId,
    event_id: toNumber(entry.event_id),
    member_id: toNumber(entry.member_id),
    team_id: toNumber(entry.team_id),
    paid_member_id: toNumber(entry.paid_member_id),
    invited_member_id: toNumber(entry.invited_member_id),
    member_type: toStringOrNull(entry.member_type),
    is_paid: coerceBoolean(entry.is_paid),
    is_complete: coerceBoolean(entry.is_complete),
    is_archived: coerceBoolean(entry.is_archived),
    is_active: coerceBoolean(entry.is_active),
    is_additional: coerceBoolean(entry.is_additional),
    date_paid: parseFunraisinDate(toStringOrNull(entry.date_paid)),
    date_completed: parseFunraisinDate(toStringOrNull(entry.date_completed)),
    total_raised: toNumber(entry.total_raised),
    total_paid_entry: toNumber(entry.total_paid_entry),
    total_paid: toNumber(entry.total_paid),
    po_number: toStringOrNull(entry.po_number),
    payment_intent_id: toStringOrNull(entry.payment_intent_id),
    tax_ref: toStringOrNull(entry.tax_ref),
    payment_method: toStringOrNull(entry.payment_method),
    date_created: parseFunraisinDate(toStringOrNull(entry.date_created)),
    last_updated: parseFunraisinDate(toStringOrNull(entry.last_updated)),
    raw: entry
  };
}

export async function POST(request: Request) {
  let body: { fromDate?: string; toDate?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const fromDate = typeof body.fromDate === "string" ? body.fromDate : "";
  const toDate = typeof body.toDate === "string" ? body.toDate : "";

  if (!DATE_PATTERN.test(fromDate) || !parseDateOnly(fromDate)) {
    return NextResponse.json({ error: "Invalid fromDate." }, { status: 400 });
  }

  if (!DATE_PATTERN.test(toDate) || !parseDateOnly(toDate)) {
    return NextResponse.json({ error: "Invalid toDate." }, { status: 400 });
  }

  const fromParsed = parseDateOnly(fromDate);
  const toParsed = parseDateOnly(toDate);
  if (!fromParsed || !toParsed || fromParsed > toParsed) {
    return NextResponse.json({ error: "fromDate must be before toDate." }, { status: 400 });
  }

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
      const response = await funraisin.fetchParticipantEvents({
        fromDate,
        toDate,
        limit: PAGE_LIMIT,
        offset
      });

      const entries =
        response.participantsevents ??
        response.data ??
        response.result ??
        (response as unknown as FunraisinParticipantEvent[]);

      if (!Array.isArray(entries) || entries.length === 0) {
        break;
      }

      pagesFetched += 1;

      const mapped = entries.map(mapParticipantEvent).filter(Boolean) as ReturnType<
        typeof mapParticipantEvent
      >[];
      const skipped = entries.length - mapped.length;
      if (skipped > 0) {
        errors.push(`Skipped ${skipped} entries without history_id.`);
      }

      if (mapped.length > 0) {
        const { error } = await supabase
          .from("event_entries")
          .upsert(mapped, { onConflict: "history_id" });

        if (error) {
          failed = true;
          errors.push(error.message);
        } else {
          rowsUpserted += mapped.length;
        }
      }

      offset += PAGE_LIMIT;

      if (entries.length < PAGE_LIMIT) {
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
    endpoint: "event_entries",
    since_ts: toSydneyISOStart(fromDate),
    until_ts: toSydneyISOEnd(toDate),
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
