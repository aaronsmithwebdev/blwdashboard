import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCsv } from "@/lib/utils/csv";
import { toNumber } from "@/lib/utils/dates";

export const runtime = "nodejs";

const MAX_BATCH_SIZE = 500;

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

function normalizeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "null") return null;
  if (trimmed === "0000-00-00" || trimmed === "0000-00-00 00:00:00") return null;
  return trimmed;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let csvText = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    csvText = await request.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "CSV payload is empty." }, { status: 400 });
  }

  const rows = parseCsv(csvText).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "CSV must include a header row and at least one data row." },
      { status: 400 }
    );
  }

  const headers = rows[0].map(normalizeHeader);
  if (headers.some((header) => !header)) {
    return NextResponse.json(
      { error: "CSV header row contains empty column names." },
      { status: 400 }
    );
  }

  const memberIndex = headers.indexOf("member_id");
  if (memberIndex === -1) {
    return NextResponse.json({ error: "CSV must include a member_id column." }, { status: 400 });
  }

  const records: Record<string, unknown>[] = [];
  const errors: string[] = [];
  const rowErrors: string[] = [];

  rows.slice(1).forEach((row, rowIndex) => {
    if (!row.some((cell) => cell.trim() !== "")) return;

    const record: Record<string, unknown> = {};
    let memberId: number | null = null;

    headers.forEach((header, index) => {
      const rawValue = row[index] ?? "";
      const value = normalizeValue(rawValue);

      if (header === "member_id") {
        const parsedId = toNumber(value);
        if (parsedId === null) {
          return;
        }
        memberId = parsedId;
        record[header] = parsedId;
      } else {
        record[header] = value;
      }
    });

    if (memberId === null) {
      rowErrors.push(`Row ${rowIndex + 2}: missing or invalid member_id.`);
      return;
    }

    records.push(record);
  });

  if (records.length === 0) {
    return NextResponse.json(
      {
        rowsParsed: 0,
        rowsUpserted: 0,
        rowsSkipped: rowErrors.length,
        errors: rowErrors
      },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  let rowsUpserted = 0;
  let failed = false;

  for (let start = 0; start < records.length; start += MAX_BATCH_SIZE) {
    const batch = records.slice(start, start + MAX_BATCH_SIZE);
    const { error } = await supabase
      .from("participants")
      .upsert(batch, { onConflict: "member_id" });

    if (error) {
      failed = true;
      errors.push(error.message);
      break;
    }

    rowsUpserted += batch.length;
  }

  const status = failed ? "failed" : "success";
  const ingestRecord = {
    endpoint: "participants_csv",
    since_ts: null,
    until_ts: null,
    rows_upserted: rowsUpserted,
    status,
    error: errors.length ? errors.join(" | ") : null
  };

  const { error: ingestError } = await supabase.from("fr_ingest_run").insert(ingestRecord);
  if (ingestError) {
    errors.push(ingestError.message);
  }

  return NextResponse.json(
    {
      rowsParsed: records.length,
      rowsUpserted,
      rowsSkipped: rowErrors.length,
      errors: [...rowErrors, ...errors],
      error: failed ? errors[0] ?? rowErrors[0] ?? "CSV import failed." : undefined
    },
    { status: failed ? 500 : 200 }
  );
}
