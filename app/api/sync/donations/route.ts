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
import type { FunraisinDonation } from "@/lib/funraisin/types";

const PAGE_LIMIT = 1000;
const PAGE_DELAY_MS = 250;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function mapDonation(donation: FunraisinDonation) {
  const donationId = toNumber(donation.donation_id);
  if (donationId === null) {
    return null;
  }

  return {
    donation_id: donationId,
    event_id: toNumber(donation.event_id),
    history_id: toNumber(donation.history_id),
    member_id: toNumber(donation.member_id),
    page_id: toNumber(donation.page_id),
    event_page_id: toNumber(donation.event_page_id),
    team_id: toNumber(donation.team_id),
    campaign_id: toNumber(donation.campaign_id),
    cause_id: toNumber(donation.cause_id),
    charity_id: toNumber(donation.charity_id),
    org_id: toNumber(donation.org_id),
    donation_type: toStringOrNull(donation.donation_type),
    donation_frequency: toStringOrNull(donation.donation_frequency),
    donation_period: toStringOrNull(donation.donation_period),
    donation_interval: toStringOrNull(donation.donation_interval),
    d_amount: toNumber(donation.d_amount),
    d_amount_local: toNumber(donation.d_amount_local),
    d_amount_sel: toStringOrNull(donation.d_amount_sel),
    d_amount_free: toNumber(donation.d_amount_free),
    d_currency: toStringOrNull(donation.d_currency),
    d_currency_rate: toNumber(donation.d_currency_rate),
    d_currency_platform_rate: toNumber(donation.d_currency_platform_rate),
    d_fee: toNumber(donation.d_fee),
    d_anonymous: coerceBoolean(donation.d_anonymous),
    d_status: toStringOrNull(donation.d_status),
    d_display_name: toStringOrNull(donation.d_display_name),
    d_fname: toStringOrNull(donation.d_fname),
    d_lname: toStringOrNull(donation.d_lname),
    d_email: toStringOrNull(donation.d_email),
    d_optin: coerceBoolean(donation.d_optin),
    d_optin_email: coerceBoolean(donation.d_optin_email),
    d_optin_sms: coerceBoolean(donation.d_optin_sms),
    d_optin_post: coerceBoolean(donation.d_optin_post),
    d_optin_phone: coerceBoolean(donation.d_optin_phone),
    d_optin_charity: coerceBoolean(donation.d_optin_charity),
    d_receipt_sent: coerceBoolean(donation.d_receipt_sent),
    d_receipt_num: toStringOrNull(donation.d_receipt_num),
    d_refund_amount: toNumber(donation.d_refund_amount),
    d_refund_date: parseFunraisinDate(toStringOrNull(donation.d_refund_date)),
    d_refund_reason: toStringOrNull(donation.d_refund_reason),
    date_created: parseFunraisinDate(toStringOrNull(donation.date_created)),
    date_paid: parseFunraisinDate(toStringOrNull(donation.date_paid)),
    date_banked: parseFunraisinDate(toStringOrNull(donation.date_banked)),
    last_updated: parseFunraisinDate(toStringOrNull(donation.last_updated)),
    payment_method: toStringOrNull(donation.payment_method),
    payment_intent_id: toStringOrNull(donation.payment_intent_id),
    payment_intent_created: parseFunraisinDate(toStringOrNull(donation.payment_intent_created)),
    stripe_payment_method: toStringOrNull(donation.stripe_payment_method),
    tax_ref: toStringOrNull(donation.tax_ref),
    po_number: toStringOrNull(donation.po_number),
    card_brand: toStringOrNull(donation.card_brand),
    card_country: toStringOrNull(donation.card_country),
    card_type: toStringOrNull(donation.card_type),
    card_expiry: toStringOrNull(donation.card_expiry),
    gateway_customer_ref: toStringOrNull(donation.gateway_customer_ref),
    gateway_card_ref: toStringOrNull(donation.gateway_card_ref),
    is_donation: coerceBoolean(donation.is_donation),
    is_profile_donation: coerceBoolean(donation.is_profile_donation),
    is_eft: coerceBoolean(donation.is_eft),
    is_mobile: coerceBoolean(donation.is_mobile),
    funraisin_synced: coerceBoolean(donation.funraisin_synced),
    donation_hash: toStringOrNull(donation.donation_hash),
    related_donation_id: toNumber(donation.related_donation_id),
    matched_id: toNumber(donation.matched_id),
    sale_id: toNumber(donation.sale_id),
    sale_item_id: toNumber(donation.sale_item_id),
    raffle_sale_id: toNumber(donation.raffle_sale_id),
    product_id: toNumber(donation.product_id),
    gift_aid: coerceBoolean(donation.gift_aid),
    utm_source: toStringOrNull(donation.utm_source),
    utm_medium: toStringOrNull(donation.utm_medium),
    utm_campaign: toStringOrNull(donation.utm_campaign),
    utm_content: toStringOrNull(donation.utm_content),
    utm_term: toStringOrNull(donation.utm_term),
    custom: donation.custom ?? null,
    raw: donation
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
      const response = await funraisin.fetchDonations({
        fromDate,
        toDate,
        limit: PAGE_LIMIT,
        offset
      });

      const donations =
        response.donations ??
        response.data ??
        response.result ??
        (response as unknown as FunraisinDonation[]);

      if (!Array.isArray(donations) || donations.length === 0) {
        break;
      }

      pagesFetched += 1;

      const mapped = donations.map(mapDonation).filter(Boolean) as ReturnType<typeof mapDonation>[];
      const skipped = donations.length - mapped.length;
      if (skipped > 0) {
        errors.push(`Skipped ${skipped} donations without donation_id.`);
      }

      if (mapped.length > 0) {
        const { error } = await supabase
          .from("donations")
          .upsert(mapped, { onConflict: "donation_id" });

        if (error) {
          failed = true;
          errors.push(error.message);
        } else {
          rowsUpserted += mapped.length;
        }
      }

      offset += PAGE_LIMIT;

      if (donations.length < PAGE_LIMIT) {
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
    endpoint: "donations",
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
