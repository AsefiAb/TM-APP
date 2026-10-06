import assert from "node:assert/strict";
import test from "node:test";
import { checkConnections, safeFailure } from "./checks";
import { SamApiError, SamClient } from "./sam-client";

const fixtureAccount = "test-account";
const config = {
  accountId: fixtureAccount,
  authorization: `Basic ${Buffer.from("test:only").toString("base64")}`,
};

function setup(override?: (url: URL) => Response | undefined) {
  const calls: URL[] = [];
  const mockFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    const custom = override?.(url);
    if (custom) return custom;
    if (url.pathname.includes("/account/info/"))
      return Response.json({
        accountId: fixtureAccount,
        name: "Private business",
        status: "active",
        authToken: "never-print-token",
        ssoUrl: "https://example.invalid/private-sso",
        provisionedCodes: [],
      });
    if (url.pathname.includes("/reporting/groups/"))
      return Response.json({
        result: { groups: [{ id: 1, name: "Private group" }] },
      });
    if (url.pathname.includes("/campaign/list"))
      return Response.json({ result: [] });
    if (url.pathname.includes("/reporting/mo/"))
      return Response.json({
        result: {
          mobileOriginatedMessages: [
            {
              from: "15555550123",
              body: "Private reply",
              timestamp: "2026-10-06 01:00:00",
            },
          ],
          page: 1,
          pageSize: 1000,
          nextPage: null,
        },
      });
    if (url.pathname.includes("/reporting/subscriber/"))
      return Response.json({
        status: true,
        error: null,
        result: {
          subscribers: [],
          pages: 0,
          count: 0,
          subscribersPerPage: 10,
        },
      });
    throw new Error("Unexpected fixture route");
  };
  return { client: new SamClient(config, { fetch: mockFetch }), calls };
}

test("six successful reads disclose no private provider fields in diagnostics", async () => {
  const { client, calls } = setup();
  const results = await checkConnections(client);
  assert.equal(calls.length, 6);
  assert.deepEqual(
    results.map(({ status }) => status),
    Array(6).fill("PASS"),
  );
  assert.match(results[0].detail, /No sender number/);
  assert.doesNotMatch(
    JSON.stringify(results),
    /test-account|Private|15555550123|never-print|private-sso/,
  );
  assert.equal(calls[5].searchParams.get("pageSize"), "10");
  assert.equal(calls[4].searchParams.get("Page"), "1");
});

test("failed account access prevents every dependent business read", async () => {
  const { client, calls } = setup(() =>
    Response.json({ error: "credential-secret" }, { status: 403 }),
  );
  const results = await checkConnections(client);
  assert.equal(calls.length, 1);
  assert.deepEqual(
    results.map(({ status }) => status),
    ["FAIL", ...Array(5).fill("SKIPPED")],
  );
  assert.match(results[0].detail, /rejected access/);
  assert.doesNotMatch(JSON.stringify(results), /credential-secret/);
});

test("rate limiting stops subsequent requests without blind retries", async () => {
  const { client, calls } = setup((url) =>
    url.pathname.includes("/reporting/groups/")
      ? Response.json({ error: "limited" }, { status: 429 })
      : undefined,
  );
  const results = await checkConnections(client);
  assert.equal(calls.length, 2);
  assert.deepEqual(
    results.map(({ status }) => status),
    ["PASS", "FAIL", ...Array(4).fill("SKIPPED")],
  );
});

test("empty groups skip subscribers without inventing an account group", async () => {
  const { client, calls } = setup((url) =>
    url.pathname.includes("/reporting/groups/")
      ? Response.json({ result: { groups: [] } })
      : undefined,
  );
  const results = await checkConnections(client);
  assert.equal(calls.length, 5);
  assert.equal(results[5].status, "SKIPPED");
});

test("HTTP success with a wrong account shape is not a passing connection", async () => {
  const { client, calls } = setup(() =>
    Response.json({ result: "looks successful" }),
  );
  const results = await checkConnections(client);
  assert.equal(calls.length, 1);
  assert.equal(results[0].status, "FAIL");
});

test("unexpected exception text never appears in diagnostics", () => {
  assert.doesNotMatch(
    safeFailure(new Error("secret token and private message")),
    /secret token|private message/,
  );
});

test("diagnostics include valid HTTP status codes without provider error text", () => {
  assert.match(safeFailure(new SamApiError("http", 405)), /HTTP 405/);
  assert.doesNotMatch(safeFailure(new SamApiError("http", NaN)), /HTTP/);
});
