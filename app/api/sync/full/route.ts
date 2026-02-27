import { DateTime } from "luxon";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseDateOnly, toSydneyISOEnd, toSydneyISOStart } from "@/lib/utils/dates";

const SYDNEY_ZONE = "Australia/Sydney";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type FullSyncBody = {
  fromDate?: string;
  toDate?: string;
  trigger?: string;
};

type SyncEndpoint = {
  endpoint: "events" | "transactions" | "event_entries" | "participants" | "donations";
  path: string;
  usesDateRange: boolean;
};

type SyncResponse = {
  pagesFetched?: number;
  rowsUpserted?: number;
  lastOffset?: number;
  errors?: string[];
  error?: string;
};

const SYNC_ENDPOINTS: SyncEndpoint[] = [
  { endpoint: "events", path: "/api/sync/events", usesDateRange: false },
  { endpoint: "transactions", path: "/api/sync/transactions", usesDateRange: true },
  { endpoint: "event_entries", path: "/api/sync/event-entries", usesDateRange: true },
  { endpoint: "participants", path: "/api/sync/participants", usesDateRange: true },
  { endpoint: "donations", path: "/api/sync/donations", usesDateRange: true }
];

function toSydneyDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const iso = DateTime.fromISO(value, { zone: SYDNEY_ZONE });
  if (iso.isValid) return iso.toFormat("yyyy-MM-dd");
  const fallback = DateTime.fromFormat(value, "yyyy-MM-dd HH:mm:ss", { zone: SYDNEY_ZONE });
  return fallback.isValid ? fallback.toFormat("yyyy-MM-dd") : null;
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!DATE_PATTERN.test(trimmed) || !parseDateOnly(trimmed)) return null;
  return trimmed;
}

async function getLastSuccessfulFullSyncDate(
  supabase: ReturnType<typeof createSupabaseAdminClient>
) {
  const { data, error } = await supabase
    .from("fr_ingest_run")
    .select("until_ts")
    .eq("endpoint", "full_sync")
    .eq("status", "success")
    .not("until_ts", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return toSydneyDateOnly(data?.until_ts) ?? null;
}

function parseSyncPayload(rawText: string) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText) as SyncResponse;
  } catch {
    return null;
  }
}

async function runEndpoint(
  request: Request,
  endpoint: SyncEndpoint,
  fromDate: string,
  toDate: string,
  forwardedHeaders: Record<string, string>
) {
  const url = new URL(endpoint.path, request.url);
  const body = endpoint.usesDateRange ? { fromDate, toDate } : {};

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...forwardedHeaders },
    body: JSON.stringify(body)
  });

  const rawText = await response.text();
  const payload = parseSyncPayload(rawText);
  const endpointErrors =
    payload?.errors && payload.errors.length > 0
      ? payload.errors
      : payload?.error
        ? [payload.error]
        : response.ok
          ? []
          : [rawText || `${endpoint.endpoint} sync failed with status ${response.status}.`];

  return {
    endpoint: endpoint.endpoint,
    ok: response.ok,
    status: response.status,
    pagesFetched: payload?.pagesFetched ?? 0,
    rowsUpserted: payload?.rowsUpserted ?? 0,
    lastOffset: payload?.lastOffset ?? 0,
    errors: endpointErrors
  };
}

export async function POST(request: Request) {
  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to initialize services." },
      { status: 500 }
    );
  }

  let body: FullSyncBody = {};
  try {
    body = (await request.json()) as FullSyncBody;
  } catch {
    body = {};
  }

  const nowSydney = DateTime.now().setZone(SYDNEY_ZONE).startOf("day");
  const defaultToDate = nowSydney.toFormat("yyyy-MM-dd");
  const defaultFromDate = nowSydney.startOf("year").toFormat("yyyy-MM-dd");

  const overrideFromDate = normalizeDateInput(body.fromDate);
  const overrideToDate = normalizeDateInput(body.toDate);
  if (body.fromDate !== undefined && !overrideFromDate) {
    return NextResponse.json({ error: "Invalid fromDate." }, { status: 400 });
  }
  if (body.toDate !== undefined && !overrideToDate) {
    return NextResponse.json({ error: "Invalid toDate." }, { status: 400 });
  }

  let lastSuccessfulDate: string | null = null;
  try {
    lastSuccessfulDate = await getLastSuccessfulFullSyncDate(supabase);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read sync history." },
      { status: 500 }
    );
  }

  const fromDate = overrideFromDate ?? lastSuccessfulDate ?? defaultFromDate;
  const toDate = overrideToDate ?? defaultToDate;
  const fromParsed = parseDateOnly(fromDate);
  const toParsed = parseDateOnly(toDate);
  if (!fromParsed || !toParsed || fromParsed > toParsed) {
    return NextResponse.json({ error: "fromDate must be before toDate." }, { status: 400 });
  }

  const runs = [];
  const forwardedHeaders: Record<string, string> = {};
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    forwardedHeaders.cookie = cookieHeader;
  }
  const authorizationHeader = request.headers.get("authorization");
  if (authorizationHeader) {
    forwardedHeaders.authorization = authorizationHeader;
  }
  for (const endpoint of SYNC_ENDPOINTS) {
    // Keep endpoint syncs ordered so dependent data stays predictable in logs/UI.
    const run = await runEndpoint(request, endpoint, fromDate, toDate, forwardedHeaders);
    runs.push(run);
  }

  let pagesFetched = 0;
  let rowsUpserted = 0;
  let lastOffset = 0;
  const errors: string[] = [];
  runs.forEach((run) => {
    pagesFetched += run.pagesFetched;
    rowsUpserted += run.rowsUpserted;
    lastOffset += run.lastOffset;
    if (run.errors.length > 0) {
      run.errors.forEach((message) => errors.push(`${run.endpoint}: ${message}`));
    }
  });

  let failed = runs.some((run) => !run.ok);
  const status = failed ? "failed" : "success";
  const trigger = typeof body.trigger === "string" && body.trigger.trim() ? body.trigger.trim() : null;
  const ingestRecord = {
    endpoint: "full_sync",
    since_ts: toSydneyISOStart(fromDate),
    until_ts: toSydneyISOEnd(toDate),
    rows_upserted: rowsUpserted,
    status,
    error: errors.length ? `${trigger ? `[${trigger}] ` : ""}${errors.join(" | ")}` : null
  };

  const { error: ingestError } = await supabase.from("fr_ingest_run").insert(ingestRecord);
  if (ingestError) {
    failed = true;
    errors.push(`full_sync log: ${ingestError.message}`);
  }

  return NextResponse.json(
    {
      fromDate,
      toDate,
      pagesFetched,
      rowsUpserted,
      lastOffset,
      errors,
      runs,
      error: failed ? errors[0] ?? "Full sync failed." : undefined
    },
    { status: failed ? 500 : 200 }
  );
}
