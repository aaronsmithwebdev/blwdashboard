import { DiscountsManager } from "@/components/settings/discounts-manager";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DiscountsPage() {
  const supabase = createSupabaseAdminClient();

  const [categoriesResult, groupsResult, tiersResult] = await Promise.all([
    supabase.from("event_category").select("id, display_name").order("display_name", {
      ascending: true
    }),
    supabase
      .from("event_group")
      .select("id, event_category_id, year")
      .order("year", { ascending: false }),
    supabase
      .from("event_group_discount")
      .select("id, event_group_id, label, discount_amount, starts_at, ends_at, notes")
      .order("ends_at", { ascending: true })
  ]);

  if (categoriesResult.error) {
    return <p className="text-sm text-red-600">{categoriesResult.error.message}</p>;
  }

  if (groupsResult.error) {
    return <p className="text-sm text-red-600">{groupsResult.error.message}</p>;
  }

  if (tiersResult.error) {
    return <p className="text-sm text-red-600">{tiersResult.error.message}</p>;
  }

  const categories = (categoriesResult.data ?? []) as {
    id: string;
    display_name: string;
  }[];
  const groups = (groupsResult.data ?? []) as {
    id: string;
    event_category_id: string;
    year: number;
  }[];
  const tiers = (tiersResult.data ?? []) as {
    id: string;
    event_group_id: string;
    label: string;
    discount_amount: number | null;
    starts_at: string | null;
    ends_at: string | null;
    notes: string | null;
  }[];

  return <DiscountsManager categories={categories} groups={groups} tiers={tiers} />;
}
