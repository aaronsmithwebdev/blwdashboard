import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-white/60 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Internal Analytics</p>
        <h2 className="text-2xl font-semibold">Event Performance</h2>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary">Private</Badge>
        <Badge variant="outline" className="border-border/60">
          Supabase
        </Badge>
      </div>
    </header>
  );
}
