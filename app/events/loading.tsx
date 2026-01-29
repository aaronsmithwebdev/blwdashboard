import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function EventsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-muted/60 animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-muted/50 animate-pulse" />
      </div>

      <Card>
        <CardHeader>
          <div className="h-5 w-40 rounded-md bg-muted/60 animate-pulse" />
          <div className="mt-2 h-3 w-64 rounded-md bg-muted/50 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="h-10 w-56 rounded-md bg-muted/50 animate-pulse" />
            <div className="h-10 w-52 rounded-md bg-muted/50 animate-pulse" />
            <div className="h-10 w-28 rounded-md bg-muted/50 animate-pulse" />
            <div className="h-10 w-24 rounded-md bg-muted/50 animate-pulse" />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-36 rounded-md bg-muted/60 animate-pulse" />
              <div className="h-3 w-60 rounded-md bg-muted/50 animate-pulse" />
              <div className="mt-3 h-3 w-48 rounded-md bg-muted/40 animate-pulse" />
            </div>
            <div className="h-16 w-36 rounded-lg border border-border/60 bg-white/80" />
          </div>
        </CardHeader>
        <CardContent className="relative h-[60vh] min-h-[420px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-border/60 border-t-primary" />
          </div>
          <div className="h-full w-full rounded-lg border border-dashed border-border/70 bg-muted/20" />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-28 rounded-md bg-muted/60 animate-pulse" />
              <div className="h-3 w-52 rounded-md bg-muted/50 animate-pulse" />
              <div className="mt-3 h-3 w-48 rounded-md bg-muted/40 animate-pulse" />
            </div>
            <div className="h-16 w-36 rounded-lg border border-border/60 bg-white/80" />
          </div>
        </CardHeader>
        <CardContent className="relative h-[60vh] min-h-[420px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-border/60 border-t-primary" />
          </div>
          <div className="h-full w-full rounded-lg border border-dashed border-border/70 bg-muted/20" />
        </CardContent>
      </Card>
    </div>
  );
}
