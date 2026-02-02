import { SignOutButton } from "@/components/auth/sign-out-button";

export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-white/60 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-2xl font-semibold">BLW Analytics</h1>
      </div>
      <div className="flex items-center gap-3">
        <SignOutButton />
      </div>
    </header>
  );
}
