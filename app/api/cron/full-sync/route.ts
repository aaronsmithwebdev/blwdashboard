import { NextResponse } from "next/server";

import { POST as runFullSync } from "@/app/api/sync/full/route";
import { isValidCronBearerToken } from "@/lib/security/cron";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorizationHeader = request.headers.get("authorization");
  if (!isValidCronBearerToken(authorizationHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUrl = new URL("/api/sync/full", request.url);
  const syncRequest = new Request(targetUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: authorizationHeader ?? ""
    },
    body: JSON.stringify({ trigger: "vercel_cron" })
  });

  return runFullSync(syncRequest);
}
