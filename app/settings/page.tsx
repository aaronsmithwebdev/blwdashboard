import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings Overview</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review and manage the reference tables powering your dashboards.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event Categories</CardTitle>
            <CardDescription>Core event series (e.g., Sydney East).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Create categories and year groups.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Event Groups (Year)</CardTitle>
            <CardDescription>Bucket each category by year.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Manage groupings that power rollups.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Group Events</CardTitle>
            <CardDescription>Assign Funraisin events to year groups.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Control reporting inclusion per event.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Discount Tiers</CardTitle>
            <CardDescription>Configure pricing windows for each event year.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Track registration discount periods.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
