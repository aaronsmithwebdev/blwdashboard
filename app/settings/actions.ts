"use server";

import "server-only";
import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ActionState = {
  ok: boolean;
  message: string;
};

const okState = (message: string) => ({ ok: true, message });
const errorState = (message: string) => ({ ok: false, message });

function parseBoolean(value: FormDataEntryValue | null) {
  if (value === null) return false;
  return value === "on" || value === "true" || value === "1";
}

export async function createEventCategory(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!slug || !displayName) {
    return errorState("Slug and display name are required.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_category").insert({
    slug,
    display_name: displayName
  });

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/event-groups");
  revalidatePath("/settings/funraisin-mapping");
  revalidatePath("/settings");
  return okState("Event category created.");
}

export async function updateEventCategory(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!id || !slug || !displayName) {
    return errorState("ID, slug, and display name are required.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_category").update({
    slug,
    display_name: displayName
  }).eq("id", id);

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/event-groups");
  revalidatePath("/settings/funraisin-mapping");
  revalidatePath("/settings");
  return okState("Event category updated.");
}

export async function deleteEventCategory(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return errorState("Missing event category ID.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_category").delete().eq("id", id);

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/event-groups");
  revalidatePath("/settings/funraisin-mapping");
  revalidatePath("/settings");
  return okState("Event category deleted.");
}

export async function createEventGroup(_: ActionState, formData: FormData): Promise<ActionState> {
  const eventCategoryId = String(formData.get("event_category_id") ?? "").trim();
  const year = Number(formData.get("year"));

  if (!eventCategoryId || !Number.isInteger(year)) {
    return errorState("Event category and year are required.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_group").insert({
    event_category_id: eventCategoryId,
    year
  });

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/event-groups");
  revalidatePath("/settings/funraisin-mapping");
  revalidatePath("/settings");
  return okState("Event group created.");
}

export async function updateEventGroup(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const eventCategoryId = String(formData.get("event_category_id") ?? "").trim();
  const year = Number(formData.get("year"));

  if (!id || !eventCategoryId || !Number.isInteger(year)) {
    return errorState("ID, event category, and year are required.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_group").update({
    event_category_id: eventCategoryId,
    year
  }).eq("id", id);

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/event-groups");
  revalidatePath("/settings/funraisin-mapping");
  revalidatePath("/settings");
  return okState("Event group updated.");
}

export async function deleteEventGroup(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return errorState("Missing event group ID.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_group").delete().eq("id", id);

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/event-groups");
  revalidatePath("/settings/funraisin-mapping");
  revalidatePath("/settings");
  return okState("Event group deleted.");
}

export async function createGroupEventMapping(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const eventGroupId = String(formData.get("event_group_id") ?? "").trim();
  const eventId = Number(formData.get("event_id"));
  const includeInReporting = parseBoolean(formData.get("include_in_reporting"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!eventGroupId || !Number.isFinite(eventId)) {
    return errorState("Event group and event ID are required.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_group_event").insert({
    event_group_id: eventGroupId,
    event_id: eventId,
    include_in_reporting: includeInReporting,
    notes
  });

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/funraisin-mapping");
  revalidatePath("/settings");
  return okState("Group mapping created.");
}

export async function updateGroupEventMapping(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const eventGroupId = String(formData.get("event_group_id") ?? "").trim();
  const eventId = Number(formData.get("event_id"));
  const includeInReporting = parseBoolean(formData.get("include_in_reporting"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id || !eventGroupId || !Number.isFinite(eventId)) {
    return errorState("ID, event group, and event ID are required.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_group_event").update({
    event_group_id: eventGroupId,
    event_id: eventId,
    include_in_reporting: includeInReporting,
    notes
  }).eq("id", id);

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/funraisin-mapping");
  revalidatePath("/settings");
  return okState("Group mapping updated.");
}

export async function deleteGroupEventMapping(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return errorState("Missing mapping ID.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_group_event").delete().eq("id", id);

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/funraisin-mapping");
  revalidatePath("/settings");
  return okState("Group mapping deleted.");
}

export async function createEventGroupDiscount(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const eventGroupId = String(formData.get("event_group_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const discountAmount = String(formData.get("discount_amount") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim() || null;
  const endsAt = String(formData.get("ends_at") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!eventGroupId || !label) {
    return errorState("Event group and label are required.");
  }

  const amountValue = discountAmount ? Number(discountAmount) : null;
  if (discountAmount && !Number.isFinite(amountValue)) {
    return errorState("Discount amount must be a number.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_group_discount").insert({
    event_group_id: eventGroupId,
    label,
    discount_amount: amountValue,
    starts_at: startsAt,
    ends_at: endsAt,
    notes
  });

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/discounts");
  revalidatePath("/settings");
  return okState("Discount tier created.");
}

export async function updateEventGroupDiscount(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const eventGroupId = String(formData.get("event_group_id") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const discountAmount = String(formData.get("discount_amount") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim() || null;
  const endsAt = String(formData.get("ends_at") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id || !eventGroupId || !label) {
    return errorState("ID, event group, and label are required.");
  }

  const amountValue = discountAmount ? Number(discountAmount) : null;
  if (discountAmount && !Number.isFinite(amountValue)) {
    return errorState("Discount amount must be a number.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_group_discount").update({
    event_group_id: eventGroupId,
    label,
    discount_amount: amountValue,
    starts_at: startsAt,
    ends_at: endsAt,
    notes
  }).eq("id", id);

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/discounts");
  revalidatePath("/settings");
  return okState("Discount tier updated.");
}

export async function deleteEventGroupDiscount(
  _: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return errorState("Missing discount ID.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("event_group_discount").delete().eq("id", id);

  if (error) {
    return errorState(error.message);
  }

  revalidatePath("/settings/discounts");
  revalidatePath("/settings");
  return okState("Discount tier deleted.");
}
