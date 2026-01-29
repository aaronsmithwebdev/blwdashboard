import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Event View", href: "/events" },
  { label: "Sync", href: "/sync" },
  { label: "Reports", href: "/reports" },
  { label: "Entries Debug", href: "/reports/entries" },
  { label: "Settings", href: "/settings" }
];

export function Sidebar() {
  return (
    <aside className="flex h-full flex-col gap-6 border-r border-border/60 bg-white/60 px-6 py-8 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">BLW Analytics</p>
        <h1 className="mt-2 text-2xl font-semibold">Event Pulse</h1>
      </div>
      <nav className="flex flex-col gap-2 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 font-medium text-foreground/80 transition hover:bg-muted/70 hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto rounded-lg border border-border/60 bg-background/80 p-4 text-xs text-muted-foreground">
        <p className="font-semibold uppercase tracking-widest text-foreground/70">Status</p>
        <p className="mt-2">Supabase + Funraisin ready.</p>
      </div>
    </aside>
  );
}
