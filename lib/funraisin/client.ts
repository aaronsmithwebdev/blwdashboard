import "server-only";
import {
  FunraisinDonationsResponse,
  FunraisinEventsResponse,
  FunraisinParticipantEventsResponse,
  FunraisinTransactionsResponse
} from "./types";

const DEFAULT_RETRY_COUNT = 2;
const DEFAULT_RETRY_DELAY_MS = 400;

export type FunraisinClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  retryCount?: number;
  retryDelayMs?: number;
};

export function createFunraisinClient(options: FunraisinClientOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.FUNRAISIN_BASE_URL;
  const apiKey = options.apiKey ?? process.env.FUNRAISIN_API_KEY;
  const debug =
    process.env.FUNRAISIN_DEBUG === "true" || process.env.NODE_ENV !== "production";

  if (!baseUrl || !apiKey) {
    throw new Error("Missing Funraisin environment variables.");
  }

  const retryCount = options.retryCount ?? DEFAULT_RETRY_COUNT;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const hasApiSuffix = /\/api$/i.test(trimmedBase);
  const baseWithSlash = `${trimmedBase}/`;

  function redactedUrl(input: URL) {
    const redacted = new URL(input.toString());
    if (redacted.searchParams.has("apikey")) {
      redacted.searchParams.set("apikey", "REDACTED");
    }
    return redacted.toString();
  }

  async function get<T>(path: string, params: Record<string, string | number | undefined>) {
    const url = new URL(path, baseWithSlash);
    Object.entries({ ...params, format: "json", apikey: apiKey }).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });

    let lastError: unknown;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        if (debug) {
          console.log(
            `[funraisin] GET ${redactedUrl(url)} (attempt ${attempt + 1}/${retryCount + 1})`
          );
        }
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Funraisin request failed (${response.status}): ${text}`);
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error;
        if (attempt >= retryCount) break;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Funraisin request failed.");
  }

  return {
    async fetchTransactions(params: {
      fromDate: string;
      toDate: string;
      funraisinEventId?: number;
      limit: number;
      offset: number;
    }) {
      const transactionsPath = hasApiSuffix ? "transactions" : "api/transactions";
      return get<FunraisinTransactionsResponse>(transactionsPath, {
        date_from: params.fromDate,
        date_to: params.toDate,
        event_id: params.funraisinEventId,
        limit: params.limit,
        offset: params.offset
      });
    },
    async fetchEvents(params: { limit: number; offset: number }) {
      const eventsPath = hasApiSuffix ? "events" : "api/events";
      return get<FunraisinEventsResponse>(eventsPath, {
        limit: params.limit,
        offset: params.offset
      });
    },
    async fetchParticipantEvents(params: {
      fromDate: string;
      toDate: string;
      limit: number;
      offset: number;
    }) {
      const participantsPath = hasApiSuffix ? "participantsevents" : "api/participantsevents";
      return get<FunraisinParticipantEventsResponse>(participantsPath, {
        date_from: params.fromDate,
        date_to: params.toDate,
        limit: params.limit,
        offset: params.offset
      });
    },
    async fetchDonations(params: {
      fromDate: string;
      toDate: string;
      limit: number;
      offset: number;
    }) {
      const donationsPath = hasApiSuffix ? "donations" : "api/donations";
      return get<FunraisinDonationsResponse>(donationsPath, {
        date_from: params.fromDate,
        date_to: params.toDate,
        limit: params.limit,
        offset: params.offset
      });
    }
  };
}
