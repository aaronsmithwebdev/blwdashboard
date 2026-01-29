import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-36 rounded-md bg-muted/60 animate-pulse" />
        <div className="h-4 w-72 rounded-md bg-muted/50 animate-pulse" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="h-5 w-40 rounded-md bg-muted/60 animate-pulse" />
              <div className="mt-2 h-3 w-64 rounded-md bg-muted/50 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-28 rounded-md bg-muted/40 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
