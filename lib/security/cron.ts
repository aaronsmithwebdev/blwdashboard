function extractBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  const trimmed = token.trim();
  return trimmed ? trimmed : null;
}

export function isValidCronBearerToken(authorizationHeader: string | null) {
  const provided = extractBearerToken(authorizationHeader);
  if (!provided) return false;

  const expectedFromCronSecret = process.env.CRON_SECRET?.trim();
  const expectedFromSyncToken = process.env.SYNC_CRON_TOKEN?.trim();
  const expectedToken = expectedFromCronSecret || expectedFromSyncToken || null;
  if (!expectedToken) return false;

  return provided === expectedToken;
}
