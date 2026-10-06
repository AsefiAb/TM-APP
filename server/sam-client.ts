/** Server-only, read-only SAM API adapter. Never import from the mobile app. */
import { Buffer } from "node:buffer";

const API_ROOT = "https://txhd.io/api/v1/";
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const MAX_ROWS = 10_000;
const TIME_RANGES = [
  "thishour",
  "today",
  "thisweek",
  "thismonth",
  "thisyear",
  "all",
] as const;

export type SamErrorCode =
  | "config"
  | "auth"
  | "missing"
  | "rate_limit"
  | "server"
  | "http"
  | "schema"
  | "provider"
  | "timeout"
  | "network";
const ERROR_MESSAGES: Record<SamErrorCode, string> = {
  config: "SAM server or request configuration is invalid.",
  auth: "SAM rejected authorization for this read request.",
  missing: "The requested SAM read endpoint was not found.",
  rate_limit: "SAM rate-limited this read request. No retry was attempted.",
  server: "SAM returned a server error. No retry was attempted.",
  http: "SAM returned an unexpected HTTP status.",
  schema: "SAM returned data that did not match the expected read contract.",
  provider: "SAM reported that the read request was unsuccessful.",
  timeout: "The SAM read request timed out. No retry was attempted.",
  network: "The SAM read request could not be completed.",
};

const DIAGNOSTIC_PATHS = [
  "incoming.response",
  "incoming.result",
  "incoming.result.mobileOriginatedMessages",
  "incoming.message",
  "incoming.message.from",
  "incoming.message.body",
  "incoming.message.timestamp",
  "incoming.result.page",
  "incoming.result.pageSize",
  "incoming.result.nextPage",
] as const;
const DIAGNOSTIC_EXPECTED = [
  "object",
  "array",
  "nonempty_string",
  "string",
  "positive_integer",
  "integer_1_to_1000",
  "requested_page",
  "at_most_page_size",
  "string_or_null_or_missing",
] as const;
const DIAGNOSTIC_OBSERVED = [
  "missing",
  "null",
  "array",
  "object",
  "string",
  "empty_string",
  "boolean",
  "zero",
  "positive_integer",
  "negative_integer",
  "non_integer_number",
  "other",
  "out_of_range",
  "different_page",
  "too_many_items",
  "too_long",
  "empty_array",
  "nonempty_array",
] as const;
type DiagnosticPath = (typeof DIAGNOSTIC_PATHS)[number];
type SchemaDiagnostic = {
  path: DiagnosticPath;
  expected: (typeof DIAGNOSTIC_EXPECTED)[number];
  observed: (typeof DIAGNOSTIC_OBSERVED)[number];
  shape?: readonly [
    (typeof DIAGNOSTIC_OBSERVED)[number],
    (typeof DIAGNOSTIC_OBSERVED)[number],
    (typeof DIAGNOSTIC_OBSERVED)[number],
    (typeof DIAGNOSTIC_OBSERVED)[number],
  ];
};

function formatDiagnostic(value?: SchemaDiagnostic): string | undefined {
  // Runtime validation keeps even a wrongly constructed error from printing data.
  if (
    !value ||
    !DIAGNOSTIC_PATHS.includes(value.path) ||
    !DIAGNOSTIC_EXPECTED.includes(value.expected) ||
    !DIAGNOSTIC_OBSERVED.includes(value.observed)
  )
    return undefined;
  const base = `${value.path}: expected ${value.expected}; observed ${value.observed}.`;
  if (
    !Array.isArray(value.shape) ||
    value.shape.length !== 4 ||
    !value.shape.every((item) => DIAGNOSTIC_OBSERVED.includes(item))
  )
    return base;
  return `${base} Incoming shape: messages=${value.shape[0]}; page=${value.shape[1]}; pageSize=${value.shape[2]}; nextPage=${value.shape[3]}.`;
}

function observedType(value: unknown): SchemaDiagnostic["observed"] {
  if (value === undefined) return "missing";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string")
    return value.trim() ? "string" : "empty_string";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) return "non_integer_number";
    return value === 0
      ? "zero"
      : value > 0
        ? "positive_integer"
        : "negative_integer";
  }
  if (typeof value === "boolean") return "boolean";
  return typeof value === "object" ? "object" : "other";
}

function schemaIssue(
  path: DiagnosticPath | undefined,
  expected: SchemaDiagnostic["expected"],
  value: unknown,
  observed?: SchemaDiagnostic["observed"],
  shape?: SchemaDiagnostic["shape"],
): SamApiError {
  return new SamApiError(
    "schema",
    undefined,
    path
      ? { path, expected, observed: observed ?? observedType(value), shape }
      : undefined,
  );
}

/** Only fixed messages and numeric HTTP status escape this boundary. No raw cause. */
export class SamApiError extends Error {
  readonly code: SamErrorCode;
  readonly status?: number;
  readonly diagnostic?: string;

  constructor(
    code: SamErrorCode,
    status?: number,
    diagnostic?: SchemaDiagnostic,
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = "SamApiError";
    this.code = code;
    this.status = status;
    this.diagnostic =
      code === "schema" ? formatDiagnostic(diagnostic) : undefined;
  }
}

export type SamClientConfig = { accountId: string; authorization: string };
export type SamClientOptions = { fetch?: typeof fetch; timeoutMs?: number };
export type SamAccount = {
  accountId: string;
  name: string;
  status: string;
  provisionedCodes: { type: string; subType: string; code: string }[];
};
export type SamGroup = { id: number; name: string };
export type SamCampaign = {
  id: string;
  name: string;
  body: string;
  type: string;
  from: string;
  scheduledTime: string | null;
  groupIds: string[];
  timestamp: string;
};
export type SamIncoming = { from: string; body: string; timestamp: string };
export type SamIncomingPage = {
  messages: SamIncoming[];
  page: number;
  pageSize: number | null;
  hasNextPage: boolean;
};
export type SamSubscriber = {
  id: number;
  phoneNumber: string;
  firstName: string;
  lastName: string;
};
export type SamSubscriberPage = {
  subscribers: SamSubscriber[];
  page: number;
  pages: number;
  count: number;
  subscribersPerPage: number;
};
export type SamTimeRange = (typeof TIME_RANGES)[number];
export type SamSubscriberQuery = {
  groupId: number;
  page?: number;
  pageSize?: number;
  usable?: boolean;
};

function record(
  value: unknown,
  path?: DiagnosticPath,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw schemaIssue(path, "object", value);
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  maxLength = 256,
  allowEmpty = false,
  path?: DiagnosticPath,
): string {
  if (
    typeof value !== "string" ||
    value.length > maxLength ||
    (!allowEmpty && !value.trim())
  )
    throw schemaIssue(
      path,
      allowEmpty ? "string" : "nonempty_string",
      value,
      typeof value === "string" && value.length > maxLength
        ? "too_long"
        : undefined,
    );
  return value;
}

function integer(
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  path?: DiagnosticPath,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw schemaIssue(
      path,
      max === 1000 ? "integer_1_to_1000" : "positive_integer",
      value,
      typeof value === "number" && Number.isSafeInteger(value) && value > max
        ? "out_of_range"
        : undefined,
    );
  return value;
}

function rows(value: unknown, path?: DiagnosticPath): unknown[] {
  if (!Array.isArray(value) || value.length > MAX_ROWS)
    throw schemaIssue(
      path,
      "array",
      value,
      Array.isArray(value) ? "too_many_items" : undefined,
    );
  return value;
}

function requestInteger(
  value: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new SamApiError("config");
}

function campaignIdentifier(value: unknown): string {
  if (typeof value === "number") return String(integer(value, 1));
  const id = text(value, 128);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new SamApiError("schema");
  return id;
}

function providerResult(
  value: unknown,
  path?: DiagnosticPath,
): Record<string, unknown> {
  const root = record(value, path);
  const hasError =
    root.error !== undefined &&
    root.error !== null &&
    !(typeof root.error === "string" && !root.error.trim());
  if (root.status === false || root.success === false || hasError)
    throw new SamApiError("provider");
  return root;
}

function httpError(status: number): SamApiError {
  const code =
    status === 401 || status === 403
      ? "auth"
      : status === 404
        ? "missing"
        : status === 429
          ? "rate_limit"
          : status >= 500
            ? "server"
            : "http";
  return new SamApiError(code, status);
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.body) throw new SamApiError("schema");
  if (Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES) {
    await response.body.cancel();
    throw new SamApiError("schema");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new SamApiError("schema");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));
  } catch {
    throw new SamApiError("schema");
  }
}

export class SamClient {
  // ECMAScript private fields also keep credentials out of ordinary object inspection.
  readonly #accountId: string;
  readonly #authorization: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(config: SamClientConfig, options: SamClientOptions = {}) {
    if (
      !config ||
      typeof config.accountId !== "string" ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(config.accountId)
    )
      throw new SamApiError("config");
    if (
      typeof config.authorization !== "string" ||
      config.authorization.length > 8192
    )
      throw new SamApiError("config");
    const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(config.authorization);
    if (
      !match ||
      Buffer.from(match[1], "base64").toString("base64") !== match[1]
    )
      throw new SamApiError("config");
    const timeoutMs = options.timeoutMs ?? 10_000;
    requestInteger(timeoutMs, 1, 60_000);
    if (options.fetch !== undefined && typeof options.fetch !== "function")
      throw new SamApiError("config");
    this.#accountId = config.accountId;
    this.#authorization = `Basic ${match[1]}`;
    this.#timeoutMs = timeoutMs;
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async #get(
    path: string,
    query?: Record<string, string>,
    incomingDiagnostics = false,
  ): Promise<Record<string, unknown>> {
    const url = new URL(path, API_ROOT);
    for (const [key, value] of Object.entries(query ?? {}))
      url.searchParams.set(key, value);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new SamApiError("timeout"));
      }, this.#timeoutMs);
    });
    const request = async () => {
      const response = await this.#fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: this.#authorization,
        },
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      // The campaign-list service returns validated read results with HTTP 202.
      // This exception does not apply to any write or other read endpoint.
      if (
        response.status !== 200 &&
        !(path === "campaign/list" && response.status === 202)
      ) {
        await response.body?.cancel();
        throw httpError(response.status);
      }
      return providerResult(
        await readJson(response),
        incomingDiagnostics ? "incoming.response" : undefined,
      );
    };
    try {
      return await Promise.race([request(), deadline]);
    } catch (error) {
      if (error instanceof SamApiError) throw error;
      throw new SamApiError(controller.signal.aborted ? "timeout" : "network");
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  async getAccount(): Promise<SamAccount> {
    const value = await this.#get(`account/info/${this.#accountId}`);
    const accountId = text(value.accountId, 64);
    if (accountId !== this.#accountId) throw new SamApiError("schema");
    return {
      accountId,
      name: text(value.name),
      status: text(value.status, 64),
      provisionedCodes: rows(value.provisionedCodes).map((item) => {
        const code = record(item);
        return {
          type: text(code.type, 64),
          subType: text(code.subType, 64),
          code: text(code.code, 64),
        };
      }),
    };
  }

  async listGroups(): Promise<SamGroup[]> {
    const value = await this.#get(`reporting/groups/${this.#accountId}`);
    return rows(record(value.result).groups).map((item) => {
      const group = record(item);
      return { id: integer(group.id, 1), name: text(group.name) };
    });
  }

  async listCampaigns(filter: "PAST" | "SCHEDULED"): Promise<SamCampaign[]> {
    if (filter !== "PAST" && filter !== "SCHEDULED")
      throw new SamApiError("config");
    const value = await this.#get("campaign/list", { filter });
    return rows(value.result).map((item) => {
      const campaign = record(item);
      return {
        id: campaignIdentifier(campaign.id),
        name: text(campaign.name),
        body: text(campaign.body, 65_536, true),
        type: text(campaign.type, 64),
        from: text(campaign.from, 64),
        scheduledTime:
          campaign.scheduledTime === null ||
          campaign.scheduledTime === undefined
            ? null
            : text(campaign.scheduledTime, 128, true),
        groupIds: rows(campaign.groupIds).map((id) => text(id, 64)),
        timestamp: text(campaign.timestamp, 128),
      };
    });
  }

  async listIncoming(
    timeRange: SamTimeRange = "today",
    page = 1,
  ): Promise<SamIncomingPage> {
    if (!TIME_RANGES.includes(timeRange)) throw new SamApiError("config");
    requestInteger(page, 1, 1_000_000);
    const value = await this.#get(
      `reporting/mo/${this.#accountId}/${timeRange}`,
      { Page: String(page) },
      true,
    );
    const result = record(value.result, "incoming.result");
    const messageRows = rows(
      result.mobileOriginatedMessages,
      "incoming.result.mobileOriginatedMessages",
    );
    if (
      result.nextPage !== undefined &&
      result.nextPage !== null &&
      typeof result.nextPage !== "string"
    )
      throw schemaIssue(
        "incoming.result.nextPage",
        "string_or_null_or_missing",
        result.nextPage,
      );
    const hasNextPage =
      typeof result.nextPage === "string" && result.nextPage.trim().length > 0;
    const terminalEmpty = messageRows.length === 0 && !hasNextPage;
    const shape: SchemaDiagnostic["shape"] = [
      messageRows.length ? "nonempty_array" : "empty_array",
      observedType(result.page),
      observedType(result.pageSize),
      observedType(result.nextPage),
    ];
    if (!terminalEmpty && result.page === undefined)
      throw schemaIssue(
        "incoming.result.page",
        "positive_integer",
        undefined,
        undefined,
        shape,
      );
    if (!terminalEmpty && result.pageSize === undefined)
      throw schemaIssue(
        "incoming.result.pageSize",
        "integer_1_to_1000",
        undefined,
        undefined,
        shape,
      );
    // Only an explicit terminal empty collection may omit pagination metadata.
    // Null means no page-size metadata was provided; no size is invented.
    const actualPage =
      result.page === undefined && terminalEmpty
        ? page
        : integer(
            result.page,
            1,
            Number.MAX_SAFE_INTEGER,
            "incoming.result.page",
          );
    const pageSize =
      result.pageSize === undefined && terminalEmpty
        ? null
        : integer(result.pageSize, 1, 1000, "incoming.result.pageSize");
    if (actualPage !== page)
      throw schemaIssue(
        "incoming.result.page",
        "requested_page",
        undefined,
        "different_page",
      );
    const messages = messageRows.map((item) => {
      const message = record(item, "incoming.message");
      return {
        from: text(message.from, 64, false, "incoming.message.from"),
        body: text(message.body, 65_536, true, "incoming.message.body"),
        timestamp: text(
          message.timestamp,
          128,
          false,
          "incoming.message.timestamp",
        ),
      };
    });
    if (pageSize !== null && messages.length > pageSize)
      throw schemaIssue(
        "incoming.result.mobileOriginatedMessages",
        "at_most_page_size",
        undefined,
        "too_many_items",
      );
    return {
      messages,
      page: actualPage,
      pageSize,
      hasNextPage,
    };
  }

  async listSubscribers(query: SamSubscriberQuery): Promise<SamSubscriberPage> {
    if (!query || typeof query !== "object" || Array.isArray(query))
      throw new SamApiError("config");
    const { groupId, page = 1, pageSize = 10, usable = true } = query;
    requestInteger(groupId, 1);
    requestInteger(page, 1, 1_000_000);
    requestInteger(pageSize, 10, 1000);
    if (typeof usable !== "boolean") throw new SamApiError("config");
    const value = await this.#get(
      `reporting/subscriber/getsubscribers/${this.#accountId}`,
      {
        groupId: String(groupId),
        page: String(page),
        pageSize: String(pageSize),
        usable: String(usable),
      },
    );
    const result = record(value.result);
    const subscribers = rows(result.subscribers).map((item) => {
      const person = record(item);
      return {
        id: integer(person.id, 1),
        phoneNumber: text(person.phoneNumber, 64),
        firstName:
          person.firstname === null || person.firstname === undefined
            ? ""
            : text(person.firstname, 256, true),
        lastName:
          person.lastname === null || person.lastname === undefined
            ? ""
            : text(person.lastname, 256, true),
      };
    });
    const pages = integer(result.pages);
    const count = integer(result.count);
    const subscribersPerPage = integer(result.subscribersPerPage, 10, 1000);
    if (
      subscribers.length > subscribersPerPage ||
      subscribers.length > count ||
      (count > 0 && pages === 0)
    )
      throw new SamApiError("schema");
    return { subscribers, page, pages, count, subscribersPerPage };
  }
}
