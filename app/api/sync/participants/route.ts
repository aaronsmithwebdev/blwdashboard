import { NextResponse } from "next/server";

import { createFunraisinClient } from "@/lib/funraisin/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseDateOnly,
  parseFunraisinDate,
  sleep,
  toNumber,
  toStringOrNull,
  toSydneyISOEnd,
  toSydneyISOStart
} from "@/lib/utils/dates";
import type { FunraisinParticipant } from "@/lib/funraisin/types";

const PAGE_LIMIT = 1000;
const PAGE_DELAY_MS = 250;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function mapParticipant(participant: FunraisinParticipant) {
  const memberId = toNumber(participant.member_id);
  if (memberId === null) {
    return null;
  }

  return {
    member_id: memberId,
    m_dob: parseFunraisinDate(toStringOrNull(participant.m_dob)),
    m_address_pcode: toStringOrNull(participant.m_address_pcode),
    m_gender: toStringOrNull(participant.m_gender),
    raw: participant
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
      const response = await funraisin.fetchParticipants({
        fromDate,
        toDate,
        limit: PAGE_LIMIT,
        offset
      });

      const participants =
        response.participants ??
        response.data ??
        response.result ??
        (response as unknown as FunraisinParticipant[]);

      if (!Array.isArray(participants) || participants.length === 0) {
        break;
      }

      pagesFetched += 1;

      const mapped = participants
        .map(mapParticipant)
        .filter(Boolean) as ReturnType<typeof mapParticipant>[];
      const skipped = participants.length - mapped.length;
      if (skipped > 0) {
        errors.push(`Skipped ${skipped} participants without member_id.`);
      }

      if (mapped.length > 0) {
        const { error } = await supabase
          .from("participants")
          .upsert(mapped, { onConflict: "member_id" });

        if (error) {
          failed = true;
          errors.push(error.message);
        } else {
          rowsUpserted += mapped.length;
        }
      }

      offset += PAGE_LIMIT;

      if (participants.length < PAGE_LIMIT) {
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
    endpoint: "participants",
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
