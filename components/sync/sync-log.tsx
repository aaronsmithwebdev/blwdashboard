"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type IngestRun = {
  id?: number | string;
  endpoint?: string;
  since_ts?: string | null;
  until_ts?: string | null;
  rows_upserted?: number | null;
  status?: string | null;
  error?: string | null;
  created_at?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "--";
  const parsed = DateTime.fromISO(value);
  return parsed.isValid ? parsed.toFormat("yyyy-LL-dd HH:mm") : value;
}

export function SyncLog({ refreshKey }: { refreshKey: number }) {
  const [runs, setRuns] = useState<IngestRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchRuns = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error: queryError } = await supabase
          .from("fr_ingest_run")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8);

        if (queryError) throw queryError;
        if (mounted) setRuns(data ?? []);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load ingest runs.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRuns();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  return (
    <div className="rounded-xl border border-border/70 bg-card/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Recent Ingest Runs</h3>
          <p className="text-sm text-muted-foreground">Latest sync activity from Funraisin.</p>
        </div>
        {loading ? (
          <Badge variant="secondary">Loading...</Badge>
        ) : (
          <Badge variant="outline" className="border-border/60">
            {runs.length} runs
          </Badge>
        )}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : runs.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No ingest runs yet.</p>
      ) : (
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Range</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run, index) => (
                <TableRow key={run.id ?? index}>
                  <TableCell>{formatDate(run.created_at)}</TableCell>
                  <TableCell>
                    {formatDate(run.since_ts)} - {formatDate(run.until_ts)}
                  </TableCell>
                  <TableCell>{run.rows_upserted ?? 0}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        run.status === "success"
                          ? "success"
                          : run.status === "failed"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {run.status ?? "unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                    {run.error || run.endpoint || "--"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
