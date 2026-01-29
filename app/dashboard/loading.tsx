import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-md bg-muted/60 animate-pulse" />
        <div className="h-4 w-64 rounded-md bg-muted/50 animate-pulse" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="h-3 w-24 rounded-md bg-muted/50 animate-pulse" />
              <div className="mt-2 h-6 w-20 rounded-md bg-muted/60 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-3 w-28 rounded-md bg-muted/40 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="h-5 w-44 rounded-md bg-muted/60 animate-pulse" />
          <div className="mt-2 h-3 w-64 rounded-md bg-muted/50 animate-pulse" />
        </CardHeader>
        <CardContent className="relative h-64">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-border/60 border-t-primary" />
          </div>
          <div className="h-full w-full rounded-lg border border-dashed border-border/70 bg-muted/20" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="h-5 w-52 rounded-md bg-muted/60 animate-pulse" />
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
