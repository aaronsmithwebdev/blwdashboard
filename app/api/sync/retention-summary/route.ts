import { NextResponse } from "next/server";
import { DateTime } from "luxon";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { year?: number | string } = {};
  try {
    body = (await request.json()) as { year?: number | string };
  } catch {
    body = {};
  }

  let requestedYear: number | null = null;
  if (body.year !== undefined && body.year !== null && body.year !== "") {
    const parsed =
      typeof body.year === "number" ? body.year : Number(String(body.year).trim());
    if (!Number.isFinite(parsed) || parsed < 2000) {
      return NextResponse.json({ error: "Invalid year." }, { status: 400 });
    }
    requestedYear = parsed;
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to initialize services." },
      { status: 500 }
    );
  }

  const errors: string[] = [];
  let failed = false;

  const nowYear = DateTime.now().setZone("Australia/Sydney").year;
  const years = requestedYear ? [requestedYear] : [nowYear - 3, nowYear - 2, nowYear - 1];

  for (const year of years) {
    const { error } = await supabase.rpc("refresh_retention_summary", { p_year: year });
    if (error) {
      failed = true;
      errors.push(`Year ${year}: ${error.message}`);
      break;
    }
  }

  const status = failed ? "failed" : "success";
  const ingestRecord = {
    endpoint: "retention_summary",
    since_ts: null,
    until_ts: null,
    rows_upserted: 0,
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
      pagesFetched: 1,
      rowsUpserted: 0,
      lastOffset: 0,
      errors,
      error: failed ? errors[0] ?? "Refresh failed." : undefined
    },
    { status: failed ? 500 : 200 }
  );
}
