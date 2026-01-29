import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function EventsSummaryLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-52 rounded-md bg-muted/60 animate-pulse" />
        <div className="h-4 w-80 rounded-md bg-muted/50 animate-pulse" />
      </div>

      <Card>
        <CardHeader>
          <div className="h-5 w-32 rounded-md bg-muted/60 animate-pulse" />
          <div className="mt-2 h-3 w-56 rounded-md bg-muted/50 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="h-10 w-32 rounded-md bg-muted/50 animate-pulse" />
            <div className="h-10 w-20 rounded-md bg-muted/50 animate-pulse" />
            <div className="h-10 w-36 rounded-md bg-muted/40 animate-pulse" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="h-5 w-48 rounded-md bg-muted/60 animate-pulse" />
          <div className="mt-2 h-3 w-72 rounded-md bg-muted/50 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-10 w-full rounded-md bg-muted/30 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-muted/30 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-muted/30 animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
