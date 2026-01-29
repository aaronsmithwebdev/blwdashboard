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
import type { FunraisinTransaction } from "@/lib/funraisin/types";

const PAGE_LIMIT = 1000;
const PAGE_DELAY_MS = 250;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function mapTransaction(transaction: FunraisinTransaction) {
  const transactionId = transaction.transaction_id;

  if (transactionId === null || transactionId === undefined || transactionId === "") {
    return null;
  }

  return {
    funraisin_transaction_id: toNumber(transactionId) ?? String(transactionId),
    transaction_type: toStringOrNull(transaction.transaction_type),
    transaction_value: toNumber(transaction.transaction_value),
    currency: toStringOrNull(transaction.currency),
    currency_rate: toNumber(transaction.currency_rate),
    transaction_fees: toNumber(transaction.transaction_fees ?? transaction.transaction_fee),
    transaction_tax: toNumber(transaction.transaction_tax),
    funraisin_event_id: toNumber(transaction.event_id),
    page_id: toNumber(transaction.page_id),
    event_page_id: toNumber(transaction.event_page_id),
    member_id: toNumber(transaction.member_id),
    donation_id: toNumber(transaction.donation_id),
    sale_id: toNumber(transaction.sale_id),
    history_id: toNumber(transaction.history_id),
    related_transaction_id: toNumber(transaction.related_transaction_id),
    payment_reference: toStringOrNull(transaction.payment_reference),
    payment_type: toStringOrNull(transaction.payment_type),
    payout_id: toNumber(transaction.payout_id),
    balance_transaction_id: toStringOrNull(transaction.balance_transaction_id),
    po_number: toStringOrNull(transaction.po_number),
    crm_transaction_id: toStringOrNull(transaction.crm_transaction_id),
    is_reconciled: coerceBoolean(transaction.is_reconciled),
    funraisin_synced: coerceBoolean(transaction.funraisin_synced),
    giftaid_claimed: coerceBoolean(transaction.giftaid_claimed),
    date_created: parseFunraisinDate(transaction.date_created),
    raw: transaction
  };
}

export async function POST(request: Request) {
  let body: { fromDate?: string; toDate?: string; funraisinEventId?: number | string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const fromDate = typeof body.fromDate === "string" ? body.fromDate : "";
  const toDate = typeof body.toDate === "string" ? body.toDate : "";
  const funraisinEventId = body.funraisinEventId;

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

  let eventFilter: number | undefined;
  if (funraisinEventId !== undefined && funraisinEventId !== null && funraisinEventId !== "") {
    if (typeof funraisinEventId !== "number" || !Number.isFinite(funraisinEventId)) {
      return NextResponse.json({ error: "funraisinEventId must be a number." }, { status: 400 });
    }
    eventFilter = funraisinEventId;
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
      const response = await funraisin.fetchTransactions({
        fromDate,
        toDate,
        funraisinEventId: eventFilter,
        limit: PAGE_LIMIT,
        offset
      });

      const transactions =
        response.transactions ?? response.data ?? response.result ?? (response as unknown as FunraisinTransaction[]);

      if (!Array.isArray(transactions) || transactions.length === 0) {
        break;
      }

      pagesFetched += 1;

      const mapped = transactions.map(mapTransaction).filter(Boolean) as ReturnType<typeof mapTransaction>[];
      const skipped = transactions.length - mapped.length;
      if (skipped > 0) {
        errors.push(`Skipped ${skipped} transactions without transaction_id.`);
      }

      if (mapped.length > 0) {
        const { error } = await supabase
          .from("fr_raw_transactions")
          .upsert(mapped, { onConflict: "funraisin_transaction_id" });

        if (error) {
          failed = true;
          errors.push(error.message);
        } else {
          rowsUpserted += mapped.length;
        }
      }

      offset += PAGE_LIMIT;

      if (transactions.length < PAGE_LIMIT) {
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
    endpoint: "transactions",
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
