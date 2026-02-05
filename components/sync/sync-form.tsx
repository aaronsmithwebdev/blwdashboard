"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { SyncLog } from "./sync-log";

type SyncResponse = {
  pagesFetched: number;
  rowsUpserted: number;
  lastOffset: number;
  errors: string[];
};

type CsvImportResponse = {
  rowsParsed: number;
  rowsUpserted: number;
  rowsSkipped: number;
  errors: string[];
};

export function SyncForm() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [funraisinEventId, setFunraisinEventId] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [eventStatus, setEventStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [eventResult, setEventResult] = useState<SyncResponse | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [entriesFromDate, setEntriesFromDate] = useState("");
  const [entriesToDate, setEntriesToDate] = useState("");
  const [entriesStatus, setEntriesStatus] = useState<"idle" | "running" | "success" | "error">(
    "idle"
  );
  const [entriesResult, setEntriesResult] = useState<SyncResponse | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [entriesCsvFile, setEntriesCsvFile] = useState<File | null>(null);
  const [entriesCsvStatus, setEntriesCsvStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const [entriesCsvResult, setEntriesCsvResult] = useState<CsvImportResponse | null>(null);
  const [entriesCsvError, setEntriesCsvError] = useState<string | null>(null);
  const [participantsFromDate, setParticipantsFromDate] = useState("");
  const [participantsToDate, setParticipantsToDate] = useState("");
  const [participantsStatus, setParticipantsStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const [participantsResult, setParticipantsResult] = useState<SyncResponse | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  const [participantsCsvFile, setParticipantsCsvFile] = useState<File | null>(null);
  const [participantsCsvStatus, setParticipantsCsvStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const [participantsCsvResult, setParticipantsCsvResult] = useState<CsvImportResponse | null>(
    null
  );
  const [participantsCsvError, setParticipantsCsvError] = useState<string | null>(null);
  const [donationsFromDate, setDonationsFromDate] = useState("");
  const [donationsToDate, setDonationsToDate] = useState("");
  const [donationsStatus, setDonationsStatus] = useState<"idle" | "running" | "success" | "error">(
    "idle"
  );
  const [donationsResult, setDonationsResult] = useState<SyncResponse | null>(null);
  const [donationsError, setDonationsError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        setIsAuthed(Boolean(data.session));
      } catch {
        setIsAuthed(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkSession();
  }, []);

  const requireAuth = process.env.NODE_ENV === "production";
  const isProtected = requireAuth && authChecked && !isAuthed;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!fromDate || !toDate) {
      setError("From and To dates are required.");
      setStatus("error");
      return;
    }

    let parsedEventId: number | undefined;
    if (funraisinEventId.trim()) {
      const parsed = Number(funraisinEventId.trim());
      if (!Number.isFinite(parsed)) {
        setError("Funraisin Event ID must be a number.");
        setStatus("error");
        return;
      }
      parsedEventId = parsed;
    }

    setStatus("running");
    try {
      const response = await fetch("/api/sync/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          funraisinEventId: parsedEventId
        })
      });

      const rawText = await response.text();
      let payload: (SyncResponse & { error?: string }) | null = null;
      try {
        payload = rawText ? (JSON.parse(rawText) as SyncResponse & { error?: string }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.error || payload?.errors?.[0] || rawText || "Sync failed.";
        throw new Error(message);
      }

      if (!payload) {
        throw new Error("Sync failed: empty response.");
      }

      setResult(payload);
      setStatus("success");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Sync failed.");
    }
  };

  const handleEventSync = async () => {
    setEventError(null);
    setEventStatus("running");

    try {
      const response = await fetch("/api/sync/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const rawText = await response.text();
      let payload: (SyncResponse & { error?: string }) | null = null;
      try {
        payload = rawText ? (JSON.parse(rawText) as SyncResponse & { error?: string }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.error || payload?.errors?.[0] || rawText || "Event sync failed.";
        throw new Error(message);
      }

      if (!payload) {
        throw new Error("Event sync failed: empty response.");
      }

      setEventResult(payload);
      setEventStatus("success");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setEventStatus("error");
      setEventError(err instanceof Error ? err.message : "Event sync failed.");
    }
  };

  const handleEntriesSync = async () => {
    setEntriesError(null);

    if (!entriesFromDate || !entriesToDate) {
      setEntriesError("From and To dates are required.");
      setEntriesStatus("error");
      return;
    }

    setEntriesStatus("running");

    try {
      const response = await fetch("/api/sync/event-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: entriesFromDate,
          toDate: entriesToDate
        })
      });

      const rawText = await response.text();
      let payload: (SyncResponse & { error?: string }) | null = null;
      try {
        payload = rawText ? (JSON.parse(rawText) as SyncResponse & { error?: string }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.error || payload?.errors?.[0] || rawText || "Event entry sync failed.";
        throw new Error(message);
      }

      if (!payload) {
        throw new Error("Event entry sync failed: empty response.");
      }

      setEntriesResult(payload);
      setEntriesStatus("success");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setEntriesStatus("error");
      setEntriesError(err instanceof Error ? err.message : "Event entry sync failed.");
    }
  };

  const handleEntriesCsvImport = async (event: React.FormEvent) => {
    event.preventDefault();
    setEntriesCsvError(null);

    if (!entriesCsvFile) {
      setEntriesCsvError("CSV file is required.");
      setEntriesCsvStatus("error");
      return;
    }

    setEntriesCsvStatus("running");

    try {
      const formData = new FormData();
      formData.append("file", entriesCsvFile);

      const response = await fetch("/api/import/event-entries", {
        method: "POST",
        body: formData
      });

      const rawText = await response.text();
      let payload: (CsvImportResponse & { error?: string }) | null = null;
      try {
        payload = rawText ? (JSON.parse(rawText) as CsvImportResponse & { error?: string }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.error || payload?.errors?.[0] || rawText || "CSV import failed.";
        throw new Error(message);
      }

      if (!payload) {
        throw new Error("CSV import failed: empty response.");
      }

      setEntriesCsvResult(payload);
      setEntriesCsvStatus("success");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setEntriesCsvStatus("error");
      setEntriesCsvError(err instanceof Error ? err.message : "CSV import failed.");
    }
  };

  const handleParticipantsSync = async () => {
    setParticipantsError(null);

    if (!participantsFromDate || !participantsToDate) {
      setParticipantsError("From and To dates are required.");
      setParticipantsStatus("error");
      return;
    }

    setParticipantsStatus("running");

    try {
      const response = await fetch("/api/sync/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: participantsFromDate,
          toDate: participantsToDate
        })
      });

      const rawText = await response.text();
      let payload: (SyncResponse & { error?: string }) | null = null;
      try {
        payload = rawText ? (JSON.parse(rawText) as SyncResponse & { error?: string }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.error || payload?.errors?.[0] || rawText || "Participant sync failed.";
        throw new Error(message);
      }

      if (!payload) {
        throw new Error("Participant sync failed: empty response.");
      }

      setParticipantsResult(payload);
      setParticipantsStatus("success");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setParticipantsStatus("error");
      setParticipantsError(err instanceof Error ? err.message : "Participant sync failed.");
    }
  };

  const handleParticipantsCsvImport = async (event: React.FormEvent) => {
    event.preventDefault();
    setParticipantsCsvError(null);

    if (!participantsCsvFile) {
      setParticipantsCsvError("CSV file is required.");
      setParticipantsCsvStatus("error");
      return;
    }

    setParticipantsCsvStatus("running");

    try {
      const formData = new FormData();
      formData.append("file", participantsCsvFile);

      const response = await fetch("/api/import/participants", {
        method: "POST",
        body: formData
      });

      const rawText = await response.text();
      let payload: (CsvImportResponse & { error?: string }) | null = null;
      try {
        payload = rawText ? (JSON.parse(rawText) as CsvImportResponse & { error?: string }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.error || payload?.errors?.[0] || rawText || "CSV import failed.";
        throw new Error(message);
      }

      if (!payload) {
        throw new Error("CSV import failed: empty response.");
      }

      setParticipantsCsvResult(payload);
      setParticipantsCsvStatus("success");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setParticipantsCsvStatus("error");
      setParticipantsCsvError(err instanceof Error ? err.message : "CSV import failed.");
    }
  };

  const handleDonationsSync = async () => {
    setDonationsError(null);

    if (!donationsFromDate || !donationsToDate) {
      setDonationsError("From and To dates are required.");
      setDonationsStatus("error");
      return;
    }

    setDonationsStatus("running");

    try {
      const response = await fetch("/api/sync/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: donationsFromDate,
          toDate: donationsToDate
        })
      });

      const rawText = await response.text();
      let payload: (SyncResponse & { error?: string }) | null = null;
      try {
        payload = rawText ? (JSON.parse(rawText) as SyncResponse & { error?: string }) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          payload?.error || payload?.errors?.[0] || rawText || "Donation sync failed.";
        throw new Error(message);
      }

      if (!payload) {
        throw new Error("Donation sync failed: empty response.");
      }

      setDonationsResult(payload);
      setDonationsStatus("success");
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setDonationsStatus("error");
      setDonationsError(err instanceof Error ? err.message : "Donation sync failed.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sync Funraisin Transactions</CardTitle>
          <CardDescription>
            Pull transactions into Supabase using a date range and optional event filter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProtected ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              Please sign in to run a sync. This page is protected in production.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromDate">From date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate">To date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="funraisinEventId">Funraisin Event ID (optional)</Label>
                <Input
                  id="funraisinEventId"
                  type="number"
                  inputMode="numeric"
                  value={funraisinEventId}
                  onChange={(event) => setFunraisinEventId(event.target.value)}
                  placeholder="e.g. 12345"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Button type="submit" disabled={status === "running"}>
                  {status === "running" ? "Syncing..." : "Sync Transactions"}
                </Button>
                {status === "success" && result ? (
                  <p className="text-sm text-muted-foreground">
                    Synced {result.rowsUpserted} rows across {result.pagesFetched} pages.
                  </p>
                ) : null}
              </div>
              {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Sync Progress</CardTitle>
          <CardDescription>Pages fetched, rows upserted, and any errors returned.</CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Pages fetched</p>
                <p className="text-lg font-semibold">{result.pagesFetched}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows upserted</p>
                <p className="text-lg font-semibold">{result.rowsUpserted}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Errors</p>
                <p className="text-lg font-semibold">{result.errors?.length ?? 0}</p>
              </div>
              {result.errors?.length ? (
                <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {result.errors.join(" | ")}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Run a sync to see progress details.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Funraisin Events</CardTitle>
          <CardDescription>Pull all event metadata into the events table.</CardDescription>
        </CardHeader>
        <CardContent>
          {isProtected ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              Please sign in to run a sync. This page is protected in production.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleEventSync} disabled={eventStatus === "running"}>
                {eventStatus === "running" ? "Syncing Events..." : "Sync Events"}
              </Button>
              {eventStatus === "success" && eventResult ? (
                <p className="text-sm text-muted-foreground">
                  Synced {eventResult.rowsUpserted} rows across {eventResult.pagesFetched} pages.
                </p>
              ) : null}
            </div>
          )}
          {eventError ? <p className="mt-3 text-sm text-red-600">{eventError}</p> : null}
          {eventResult ? (
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Pages fetched</p>
                <p className="text-lg font-semibold">{eventResult.pagesFetched}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows upserted</p>
                <p className="text-lg font-semibold">{eventResult.rowsUpserted}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Errors</p>
                <p className="text-lg font-semibold">{eventResult.errors?.length ?? 0}</p>
              </div>
              {eventResult.errors?.length ? (
                <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {eventResult.errors.join(" | ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Event Entries</CardTitle>
          <CardDescription>
            Pull participant event registrations into the event_entries table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProtected ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              Please sign in to run a sync. This page is protected in production.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entriesFromDate">From date</Label>
                <Input
                  id="entriesFromDate"
                  type="date"
                  value={entriesFromDate}
                  onChange={(event) => setEntriesFromDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entriesToDate">To date</Label>
                <Input
                  id="entriesToDate"
                  type="date"
                  value={entriesToDate}
                  onChange={(event) => setEntriesToDate(event.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Button type="button" onClick={handleEntriesSync} disabled={entriesStatus === "running"}>
                  {entriesStatus === "running" ? "Syncing Entries..." : "Sync Event Entries"}
                </Button>
                {entriesStatus === "success" && entriesResult ? (
                  <p className="text-sm text-muted-foreground">
                    Synced {entriesResult.rowsUpserted} rows across {entriesResult.pagesFetched} pages.
                  </p>
                ) : null}
              </div>
              {entriesError ? (
                <p className="md:col-span-2 text-sm text-red-600">{entriesError}</p>
              ) : null}
            </div>
          )}

          {entriesResult ? (
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Pages fetched</p>
                <p className="text-lg font-semibold">{entriesResult.pagesFetched}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows upserted</p>
                <p className="text-lg font-semibold">{entriesResult.rowsUpserted}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Errors</p>
                <p className="text-lg font-semibold">{entriesResult.errors?.length ?? 0}</p>
              </div>
              {entriesResult.errors?.length ? (
                <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {entriesResult.errors.join(" | ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Event Entries (CSV)</CardTitle>
          <CardDescription>
            Upsert event_entries rows by history_id using a CSV header that matches column names.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProtected ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              Please sign in to run an import. This page is protected in production.
            </div>
          ) : (
            <form onSubmit={handleEntriesCsvImport} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="entriesCsvFile">CSV file</Label>
                <Input
                  id="entriesCsvFile"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setEntriesCsvFile(file);
                    setEntriesCsvStatus("idle");
                    setEntriesCsvResult(null);
                    setEntriesCsvError(null);
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Required column: history_id. Other headers should match event_entries column names.
                </p>
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Button type="submit" disabled={entriesCsvStatus === "running"}>
                  {entriesCsvStatus === "running" ? "Importing..." : "Import CSV"}
                </Button>
                {entriesCsvStatus === "success" && entriesCsvResult ? (
                  <p className="text-sm text-muted-foreground">
                    Upserted {entriesCsvResult.rowsUpserted} of {entriesCsvResult.rowsParsed} rows.
                  </p>
                ) : null}
              </div>
              {entriesCsvError ? (
                <p className="md:col-span-2 text-sm text-red-600">{entriesCsvError}</p>
              ) : null}
            </form>
          )}

          {entriesCsvResult ? (
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows parsed</p>
                <p className="text-lg font-semibold">{entriesCsvResult.rowsParsed}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows upserted</p>
                <p className="text-lg font-semibold">{entriesCsvResult.rowsUpserted}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows skipped</p>
                <p className="text-lg font-semibold">{entriesCsvResult.rowsSkipped}</p>
              </div>
              {entriesCsvResult.errors?.length ? (
                <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {entriesCsvResult.errors.join(" | ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Participants</CardTitle>
          <CardDescription>
            Pull participant profile fields (DOB, postcode, gender) into the participants table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProtected ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              Please sign in to run a sync. This page is protected in production.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="participantsFromDate">From date</Label>
                <Input
                  id="participantsFromDate"
                  type="date"
                  value={participantsFromDate}
                  onChange={(event) => setParticipantsFromDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="participantsToDate">To date</Label>
                <Input
                  id="participantsToDate"
                  type="date"
                  value={participantsToDate}
                  onChange={(event) => setParticipantsToDate(event.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleParticipantsSync}
                  disabled={participantsStatus === "running"}
                >
                  {participantsStatus === "running" ? "Syncing Participants..." : "Sync Participants"}
                </Button>
                {participantsStatus === "success" && participantsResult ? (
                  <p className="text-sm text-muted-foreground">
                    Synced {participantsResult.rowsUpserted} rows across {participantsResult.pagesFetched} pages.
                  </p>
                ) : null}
              </div>
              {participantsError ? (
                <p className="md:col-span-2 text-sm text-red-600">{participantsError}</p>
              ) : null}
            </div>
          )}

          {participantsResult ? (
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Pages fetched</p>
                <p className="text-lg font-semibold">{participantsResult.pagesFetched}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows upserted</p>
                <p className="text-lg font-semibold">{participantsResult.rowsUpserted}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Errors</p>
                <p className="text-lg font-semibold">{participantsResult.errors?.length ?? 0}</p>
              </div>
              {participantsResult.errors?.length ? (
                <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {participantsResult.errors.join(" | ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Participants (CSV)</CardTitle>
          <CardDescription>
            Upsert participants by member_id using a CSV header that matches column names.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProtected ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              Please sign in to run an import. This page is protected in production.
            </div>
          ) : (
            <form onSubmit={handleParticipantsCsvImport} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="participantsCsvFile">CSV file</Label>
                <Input
                  id="participantsCsvFile"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setParticipantsCsvFile(file);
                    setParticipantsCsvStatus("idle");
                    setParticipantsCsvResult(null);
                    setParticipantsCsvError(null);
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Required column: member_id. Other headers should match participants column names.
                </p>
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Button type="submit" disabled={participantsCsvStatus === "running"}>
                  {participantsCsvStatus === "running" ? "Importing..." : "Import CSV"}
                </Button>
                {participantsCsvStatus === "success" && participantsCsvResult ? (
                  <p className="text-sm text-muted-foreground">
                    Upserted {participantsCsvResult.rowsUpserted} of {participantsCsvResult.rowsParsed} rows.
                  </p>
                ) : null}
              </div>
              {participantsCsvError ? (
                <p className="md:col-span-2 text-sm text-red-600">{participantsCsvError}</p>
              ) : null}
            </form>
          )}

          {participantsCsvResult ? (
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows parsed</p>
                <p className="text-lg font-semibold">{participantsCsvResult.rowsParsed}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows upserted</p>
                <p className="text-lg font-semibold">{participantsCsvResult.rowsUpserted}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows skipped</p>
                <p className="text-lg font-semibold">{participantsCsvResult.rowsSkipped}</p>
              </div>
              {participantsCsvResult.errors?.length ? (
                <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {participantsCsvResult.errors.join(" | ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Donations</CardTitle>
          <CardDescription>Pull donations into the donations table.</CardDescription>
        </CardHeader>
        <CardContent>
          {isProtected ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              Please sign in to run a sync. This page is protected in production.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="donationsFromDate">From date</Label>
                <Input
                  id="donationsFromDate"
                  type="date"
                  value={donationsFromDate}
                  onChange={(event) => setDonationsFromDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donationsToDate">To date</Label>
                <Input
                  id="donationsToDate"
                  type="date"
                  value={donationsToDate}
                  onChange={(event) => setDonationsToDate(event.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <Button type="button" onClick={handleDonationsSync} disabled={donationsStatus === "running"}>
                  {donationsStatus === "running" ? "Syncing Donations..." : "Sync Donations"}
                </Button>
                {donationsStatus === "success" && donationsResult ? (
                  <p className="text-sm text-muted-foreground">
                    Synced {donationsResult.rowsUpserted} rows across {donationsResult.pagesFetched} pages.
                  </p>
                ) : null}
              </div>
              {donationsError ? (
                <p className="md:col-span-2 text-sm text-red-600">{donationsError}</p>
              ) : null}
            </div>
          )}

          {donationsResult ? (
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Pages fetched</p>
                <p className="text-lg font-semibold">{donationsResult.pagesFetched}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Rows upserted</p>
                <p className="text-lg font-semibold">{donationsResult.rowsUpserted}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Errors</p>
                <p className="text-lg font-semibold">{donationsResult.errors?.length ?? 0}</p>
              </div>
              {donationsResult.errors?.length ? (
                <div className="md:col-span-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {donationsResult.errors.join(" | ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <SyncLog refreshKey={refreshKey} />
    </div>
  );
}
