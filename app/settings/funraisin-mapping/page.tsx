import { EventMappingManager } from "@/components/settings/event-mapping-manager";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function FunraisinMappingPage() {
  const supabase = createSupabaseAdminClient();

  const [eventsResult, mappingResult, groupsResult, categoriesResult] = await Promise.all([
    supabase
      .from("events")
      .select("event_id, event_name, event_code")
      .order("event_date", { ascending: false }),
    supabase
      .from("event_group_event")
      .select("id, event_group_id, event_id, include_in_reporting, notes")
      .order("created_at", { ascending: false }),
    supabase
      .from("event_group")
      .select("id, event_category_id, year")
      .order("year", { ascending: false }),
    supabase.from("event_category").select("id, slug, display_name").order("display_name", {
      ascending: true
    })
  ]);

  if (eventsResult.error) {
    return <p className="text-sm text-red-600">{eventsResult.error.message}</p>;
  }

  if (mappingResult.error) {
    return <p className="text-sm text-red-600">{mappingResult.error.message}</p>;
  }

  if (groupsResult.error) {
    return <p className="text-sm text-red-600">{groupsResult.error.message}</p>;
  }

  if (categoriesResult.error) {
    return <p className="text-sm text-red-600">{categoriesResult.error.message}</p>;
  }

  const events = (eventsResult.data ?? []) as {
    event_id: number;
    event_name: string | null;
    event_code: string | null;
  }[];
  const mappings = (mappingResult.data ?? []) as {
    id: string;
    event_group_id: string;
    event_id: number;
    include_in_reporting: boolean | null;
    notes: string | null;
  }[];
  const groups = (groupsResult.data ?? []) as {
    id: string;
    event_category_id: string;
    year: number;
  }[];
  const categories = (categoriesResult.data ?? []) as {
    id: string;
    slug: string;
    display_name: string;
  }[];

  return (
    <EventMappingManager
      events={events}
      mappings={mappings}
      groups={groups}
      categories={categories}
    />
  );
}
