import Link from "next/link";

const settingsNav = [
  { label: "Overview", href: "/settings" },
  { label: "Categories & Years", href: "/settings/event-groups" },
  { label: "Group Events", href: "/settings/funraisin-mapping" },
  { label: "Discounts", href: "/settings/discounts" }
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-xl border border-border/70 bg-white/70 p-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="mt-1 text-xs text-muted-foreground">Manage reference data and mappings.</p>
        <nav className="mt-4 flex flex-col gap-2 text-sm">
          {settingsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 font-medium text-foreground/80 transition hover:bg-muted/70 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
