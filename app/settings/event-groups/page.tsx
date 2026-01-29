import { EventGroupsManager } from "@/components/settings/event-groups-manager";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function EventGroupsPage() {
  const supabase = createSupabaseAdminClient();
  const [categoriesResult, groupsResult, mappingsResult] = await Promise.all([
    supabase
      .from("event_category")
      .select("id, slug, display_name, created_at")
      .order("display_name", { ascending: true }),
    supabase
      .from("event_group")
      .select("id, event_category_id, year, created_at")
      .order("year", { ascending: false }),
    supabase.from("event_group_event").select("event_group_id")
  ]);

  if (categoriesResult.error) {
    return <p className="text-sm text-red-600">{categoriesResult.error.message}</p>;
  }

  if (groupsResult.error) {
    return <p className="text-sm text-red-600">{groupsResult.error.message}</p>;
  }

  if (mappingsResult.error) {
    return <p className="text-sm text-red-600">{mappingsResult.error.message}</p>;
  }

  const categories = (categoriesResult.data ?? []) as {
    id: string;
    slug: string;
    display_name: string;
    created_at?: string;
  }[];
  const groups = (groupsResult.data ?? []) as {
    id: string;
    event_category_id: string;
    year: number;
    created_at?: string;
  }[];
  const mappingCounts = (mappingsResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
    const key = String((row as { event_group_id: string }).event_group_id);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return <EventGroupsManager categories={categories} groups={groups} mappingCounts={mappingCounts} />;
}
