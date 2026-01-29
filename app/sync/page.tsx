import { SyncForm } from "@/components/sync/sync-form";

export default function SyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Sync</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingest Funraisin data into Supabase. This page is restricted in production.
        </p>
      </div>
      <SyncForm />
    </div>
  );
}
