import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const reports = [
  {
    title: "Discount Performance",
    description: "Compare paid entrants and revenue across discount windows and years.",
    href: "/reports/discounts"
  },
  {
    title: "Events Summary",
    description: "Yearly rollup of paid entry revenue and donations by event group.",
    href: "/reports/events-summary"
  },
  {
    title: "Entries Debug",
    description: "Debug paid entry counts for events in a selected year.",
    href: "/reports/entries"
  },
  {
    title: "Retention",
    description: "Repeat participation and fundraising trends for recent years.",
    href: "/reports/retention"
  }
];

export default function ReportsIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse the reports that are currently available.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Link key={report.href} href={report.href} className="group">
            <Card className="h-full transition group-hover:border-primary/40 group-hover:shadow-sm">
              <CardHeader>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">Open report -&gt;</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
