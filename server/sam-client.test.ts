import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import { inspect } from "node:util";
import { SamApiError, SamClient, type SamErrorCode } from "./sam-client";

// Synthetic credentials and records only. Every request uses an injected fixture.
const accountId = "ACCOUNT_TEST_1";
const authorization = `Basic ${Buffer.from("fixture-user:fixture-password").toString("base64")}`;
const config = { accountId, authorization };
const account = {
  accountId,
  name: "Fictional test business",
  status: "active",
  provisionedCodes: [
    {
      type: "SMS",
      subType: "LONG_CODE",
      code: "12025550123",
      password: "must-not-return",
    },
  ],
  authToken: "must-not-return",
  password: "must-not-return",
  ssoUrl: "https://example.invalid/private-sign-in",
  unexpected: { privateData: "must-not-return" },
};
const campaign = {
  id: 11,
  name: "Fixture campaign",
  body: "A fictional message.",
  type: "SCHEDULED",
  from: "12025550123",
  scheduledTime: "2026-11-06 10:00:00",
  groupIds: ["5"],
  timestamp: "2026-10-06 10:00:00",
  queueName: "private-queue",
  authToken: "must-not-return",
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fixture(payload: unknown) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return json(payload);
  };
  return { calls, client: new SamClient(config, { fetch: fetcher }) };
}

function errorCode(code: SamErrorCode, status?: number) {
  return (error: unknown) => {
    assert.ok(error instanceof SamApiError);
    assert.equal(error.code, code);
    if (status !== undefined) assert.equal(error.status, status);
    assert.doesNotMatch(
      `${error.message} ${error.stack} ${JSON.stringify(error)}`,
      /fixture-password|must-not-return|private-sign-in|private-queue/,
    );
    assert.equal(Object.hasOwn(error, "cause"), false);
    return true;
  };
}

test("configuration rejects unsafe IDs and incomplete authorization before any request", () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return json(account);
  };
  for (const id of [
    "",
    "../other",
    "account?token=secret",
    "https://other.invalid",
    "id/path",
    "account id",
    "x".repeat(65),
  ])
    assert.throws(
      () => new SamClient({ ...config, accountId: id }, { fetch: fetcher }),
      errorCode("config"),
    );
  for (const header of [
    "",
    "Bearer fixture-password",
    authorization.replace("Basic ", ""),
    `${authorization}\r\nX-Leak: yes`,
    "Basic !!!!",
    "Basic A===",
    "Basic Zg",
  ])
    assert.throws(
      () =>
        new SamClient({ ...config, authorization: header }, { fetch: fetcher }),
      errorCode("config"),
    );
  for (const timeoutMs of [0, -1, NaN, Infinity, 60_001])
    assert.throws(
      () => new SamClient(config, { fetch: fetcher, timeoutMs }),
      errorCode("config"),
    );
  assert.equal(calls, 0);
});

test("account projection excludes credentials, nested extras, and accidental object inspection", async () => {
  const { client, calls } = fixture(account);
  assert.deepEqual(await client.getAccount(), {
    accountId,
    name: "Fictional test business",
    status: "active",
    provisionedCodes: [
      { type: "SMS", subType: "LONG_CODE", code: "12025550123" },
    ],
  });
  assert.doesNotMatch(
    inspect(client, { showHidden: true }),
    /fixture-password|Basic|ACCOUNT_TEST_1/,
  );
  assert.equal(
    calls[0].url,
    `https://txhd.io/api/v1/account/info/${accountId}`,
  );
  assert.equal(calls[0].init?.method, "GET");
  assert.equal(calls[0].init?.redirect, "error");
  assert.equal(calls[0].init?.credentials, "omit");
  assert.equal(calls[0].init?.cache, "no-store");
  assert.equal(
    new Headers(calls[0].init?.headers).get("authorization"),
    authorization,
  );
  assert.equal(calls[0].init?.body, undefined);
});

test("Basic scheme is case-insensitive while the outgoing header stays canonical", async () => {
  let header = "";
  const client = new SamClient(
    { ...config, authorization: authorization.replace("Basic", "basic") },
    {
      fetch: async (_input, init) => {
        header = new Headers(init?.headers).get("authorization") ?? "";
        return json(account);
      },
    },
  );
  await client.getAccount();
  assert.equal(header, authorization);
});

test("account identity must match the configured tenant exactly", async () => {
  await assert.rejects(
    fixture({ ...account, accountId: "ANOTHER_ACCOUNT" }).client.getAccount(),
    errorCode("schema"),
  );
  await assert.rejects(
    fixture({
      ...account,
      accountId: accountId.toLowerCase(),
    }).client.getAccount(),
    errorCode("schema"),
  );
});

test("group and campaign projections use only documented fields and fixed read routes", async () => {
  const groups = fixture({
    result: {
      groups: [{ id: 5, name: "Members", authToken: "must-not-return" }],
    },
  });
  assert.deepEqual(await groups.client.listGroups(), [
    { id: 5, name: "Members" },
  ]);
  assert.equal(
    groups.calls[0].url,
    `https://txhd.io/api/v1/reporting/groups/${accountId}`,
  );
  const campaigns = fixture({ result: [campaign] });
  const projected = await campaigns.client.listCampaigns("PAST");
  assert.deepEqual(projected, [
    {
      id: "11",
      name: campaign.name,
      body: campaign.body,
      type: campaign.type,
      from: campaign.from,
      scheduledTime: campaign.scheduledTime,
      groupIds: campaign.groupIds,
      timestamp: campaign.timestamp,
    },
  ]);
  await campaigns.client.listCampaigns("SCHEDULED");
  assert.deepEqual(
    campaigns.calls.map((call) => call.url),
    [
      "https://txhd.io/api/v1/campaign/list?filter=PAST",
      "https://txhd.io/api/v1/campaign/list?filter=SCHEDULED",
    ],
  );
  const stringId = fixture({ result: [{ ...campaign, id: "campaign_001" }] });
  assert.equal(
    (await stringId.client.listCampaigns("PAST"))[0].id,
    "campaign_001",
  );
});

test("incoming pagination never follows or returns an untrusted next-page URL", async () => {
  const incoming = fixture({
    result: {
      mobileOriginatedMessages: [
        {
          from: "12025550101",
          body: "Hello",
          timestamp: "2026-10-06 10:00:00",
          accountId: "private",
        },
      ],
      pageSize: 1000,
      nextPage: "https://attacker.invalid/collect?credential=must-not-return",
      page: 1,
    },
  });
  assert.deepEqual(await incoming.client.listIncoming(), {
    messages: [
      { from: "12025550101", body: "Hello", timestamp: "2026-10-06 10:00:00" },
    ],
    page: 1,
    pageSize: 1000,
    hasNextPage: true,
  });
  assert.equal(incoming.calls.length, 1);
  assert.equal(
    incoming.calls[0].url,
    `https://txhd.io/api/v1/reporting/mo/${accountId}/today?Page=1`,
  );
  const lastPage = fixture({
    result: {
      mobileOriginatedMessages: [],
      pageSize: 1000,
      nextPage: null,
      page: 2,
    },
  });
  assert.equal(
    (await lastPage.client.listIncoming("thisweek", 2)).hasNextPage,
    false,
  );
  assert.equal(
    lastPage.calls[0].url,
    `https://txhd.io/api/v1/reporting/mo/${accountId}/thisweek?Page=2`,
  );
});

test("subscriber projection drops CRM billing and unrelated personal fields", async () => {
  const subscribers = fixture({
    result: {
      subscribers: [
        {
          id: 4,
          phoneNumber: "12025550101",
          firstname: "Test",
          lastname: "Customer",
          email: "private@example.invalid",
          nextBillingDate: "private",
          isPastDue: true,
          address: "private",
          authToken: "must-not-return",
        },
      ],
      pages: 23,
      count: 226,
      subscribersPerPage: 10,
    },
    status: true,
    error: null,
  });
  assert.deepEqual(await subscribers.client.listSubscribers({ groupId: 5 }), {
    subscribers: [
      {
        id: 4,
        phoneNumber: "12025550101",
        firstName: "Test",
        lastName: "Customer",
      },
    ],
    page: 1,
    pages: 23,
    count: 226,
    subscribersPerPage: 10,
  });
  assert.equal(
    subscribers.calls[0].url,
    `https://txhd.io/api/v1/reporting/subscriber/getsubscribers/${accountId}?groupId=5&page=1&pageSize=10&usable=true`,
  );
});

test("invalid filters, ranges, and pagination cannot become requests", async () => {
  const { client, calls } = fixture({});
  await assert.rejects(
    client.listCampaigns("PAST&extra=true" as "PAST"),
    errorCode("config"),
  );
  await assert.rejects(
    client.listIncoming("../other" as "today"),
    errorCode("config"),
  );
  await assert.rejects(client.listIncoming("today", 0), errorCode("config"));
  for (const query of [
    { groupId: 0 },
    { groupId: 1.5 },
    { groupId: 5, page: -1 },
    { groupId: 5, pageSize: 9 },
    { groupId: 5, pageSize: 1001 },
    { groupId: 5, usable: "yes" as unknown as boolean },
  ])
    await assert.rejects(client.listSubscribers(query), errorCode("config"));
  assert.equal(calls.length, 0);
});

test("HTTP failures are classified without response content and without retries", async () => {
  for (const [status, code] of [
    [401, "auth"],
    [403, "auth"],
    [404, "missing"],
    [429, "rate_limit"],
    [500, "server"],
    [503, "server"],
    [418, "http"],
    [201, "http"],
    [204, "http"],
    [302, "http"],
  ] as const) {
    let calls = 0;
    const client = new SamClient(config, {
      fetch: async () => {
        calls += 1;
        return new Response(
          status === 204 ? null : "must-not-return fixture-password",
          { status },
        );
      },
    });
    await assert.rejects(client.getAccount(), errorCode(code, status));
    assert.equal(calls, 1);
  }
});

test("provider failures and unknown 200 shapes never report successful data", async () => {
  for (const payload of [
    { ...account, status: false },
    { ...account, error: "must-not-return" },
    { ...account, error: { password: "fixture-password" } },
    { ...account, success: false },
  ])
    await assert.rejects(
      fixture(payload).client.getAccount(),
      errorCode("provider"),
    );
  await assert.rejects(
    fixture({ ok: true }).client.getAccount(),
    errorCode("schema"),
  );
  await assert.rejects(
    fixture({
      result: { groups: [{ id: "5", name: "Test" }] },
    }).client.listGroups(),
    errorCode("schema"),
  );
  await assert.rejects(
    fixture({ result: [{ ...campaign, body: 42 }] }).client.listCampaigns(
      "PAST",
    ),
    errorCode("schema"),
  );
  await assert.rejects(
    fixture({
      result: { mobileOriginatedMessages: [], pageSize: 1000, page: 2 },
    }).client.listIncoming(),
    errorCode("schema"),
  );
  const badJson = new SamClient(config, {
    fetch: async () => new Response("must-not-return: not JSON"),
  });
  await assert.rejects(badJson.getAccount(), errorCode("schema"));
});

test("network and redirect failures do not expose the underlying error", async () => {
  let calls = 0;
  const client = new SamClient(config, {
    fetch: async () => {
      calls += 1;
      throw new Error(`Redirect rejected; ${authorization}; fixture-password`);
    },
  });
  await assert.rejects(client.getAccount(), errorCode("network"));
  assert.equal(calls, 1);
});

test("timeout bounds both fetch and body reads even when a fixture ignores abort", async () => {
  let observedSignal: AbortSignal | null | undefined;
  const slowFetch = new SamClient(config, {
    timeoutMs: 10,
    fetch: async (_input, init) => {
      observedSignal = init?.signal;
      return new Promise<Response>(() => {});
    },
  });
  await assert.rejects(slowFetch.getAccount(), errorCode("timeout"));
  assert.equal(observedSignal?.aborted, true);
  const slowBody = new SamClient(config, {
    timeoutMs: 10,
    fetch: async () => new Response(new ReadableStream<Uint8Array>()),
  });
  await assert.rejects(slowBody.getAccount(), errorCode("timeout"));
});

test("oversized response bodies are rejected before JSON projection", async () => {
  const tooLarge = new SamClient(config, {
    fetch: async () => new Response("x".repeat(4 * 1024 * 1024 + 1)),
  });
  await assert.rejects(tooLarge.getAccount(), errorCode("schema"));
});

test("incoming diagnostics identify only fixed field paths and JSON type categories", async () => {
  const validResult = {
    mobileOriginatedMessages: [],
    page: 1,
    pageSize: 1000,
    nextPage: null,
  };
  const cases: [unknown, string][] = [
    [[], "incoming.response: expected object; observed array."],
    [{ result: [] }, "incoming.result: expected object; observed array."],
    [
      { result: { ...validResult, page: "PRIVATE_MARKER_ACCOUNT_99117" } },
      "incoming.result.page: expected positive_integer; observed string.",
    ],
    [
      { result: { ...validResult, page: 0 } },
      "incoming.result.page: expected positive_integer; observed zero.",
    ],
    [
      { result: { ...validResult, page: 99117 } },
      "incoming.result.page: expected requested_page; observed different_page.",
    ],
    [
      { result: { ...validResult, pageSize: undefined } },
      "incoming.result.pageSize: expected integer_1_to_1000; observed missing.",
    ],
    [
      { result: { ...validResult, pageSize: 0 } },
      "incoming.result.pageSize: expected integer_1_to_1000; observed zero.",
    ],
    [
      { result: { ...validResult, pageSize: 99117 } },
      "incoming.result.pageSize: expected integer_1_to_1000; observed out_of_range.",
    ],
    [
      { result: { ...validResult, mobileOriginatedMessages: null } },
      "incoming.result.mobileOriginatedMessages: expected array; observed null.",
    ],
    [
      {
        result: {
          ...validResult,
          nextPage: { PRIVATE_MARKER_KEY: "PRIVATE_MARKER_SECRET" },
        },
      },
      "incoming.result.nextPage: expected string_or_null_or_missing; observed object.",
    ],
  ];
  for (const [payload, expected] of cases) {
    await assert.rejects(fixture(payload).client.listIncoming(), (error) => {
      assert.ok(error instanceof SamApiError);
      assert.equal(error.code, "schema");
      assert.equal(error.diagnostic, expected);
      assert.doesNotMatch(JSON.stringify(error), /PRIVATE_MARKER|99117/);
      return true;
    });
  }
});

test("incoming message diagnostics never contain body values, arbitrary keys, or row indices", async () => {
  const payload = {
    result: {
      page: 1,
      pageSize: 1000,
      mobileOriginatedMessages: [
        {
          from: "PRIVATE_MARKER_PHONE",
          body: { PRIVATE_MARKER_KEY: "PRIVATE_MARKER_SECRET" },
          timestamp: "PRIVATE_MARKER_DATE",
        },
      ],
    },
  };
  await assert.rejects(fixture(payload).client.listIncoming(), (error) => {
    assert.ok(error instanceof SamApiError);
    assert.equal(
      error.diagnostic,
      "incoming.message.body: expected string; observed object.",
    );
    assert.doesNotMatch(
      `${JSON.stringify(error)} ${error.message}`,
      /PRIVATE_MARKER|\[0\]/,
    );
    return true;
  });
});

test("diagnostic constructor rejects untrusted paths, expected types, and observed categories", () => {
  for (const diagnostic of [
    { path: "PRIVATE_MARKER_PATH", expected: "object", observed: "object" },
    {
      path: "incoming.result",
      expected: "PRIVATE_MARKER_EXPECTED",
      observed: "object",
    },
    {
      path: "incoming.result",
      expected: "object",
      observed: "PRIVATE_MARKER_OBSERVED",
    },
  ]) {
    const error = new SamApiError("schema", undefined, diagnostic as never);
    assert.equal(error.diagnostic, undefined);
    assert.doesNotMatch(JSON.stringify(error), /PRIVATE_MARKER/);
  }
});
