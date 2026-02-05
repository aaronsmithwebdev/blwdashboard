import { Suspense } from "react";

import { LoginClient } from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4">
          <p className="text-sm text-muted-foreground">Loading login…</p>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
