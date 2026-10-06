import assert from "node:assert/strict";
import test from "node:test";
import { readSamConfig, SamSetupError } from "./config";

test("reads the dedicated local config with either copied Basic form", () => {
  const token = Buffer.from("fixture:synthetic").toString("base64");
  for (const value of [token, `Basic ${token}`, `basic ${token}`]) {
    assert.deepEqual(
      readSamConfig({}, `SAM_ACCOUNT_ID="demo"\nSAM_AUTHORIZATION="${value}"`),
      {
        accountId: "demo",
        authorization: `Basic ${token}`,
      },
    );
  }
});

test("environment credentials take precedence as an atomic pair", () => {
  assert.throws(
    () =>
      readSamConfig(
        { SAM_ACCOUNT_ID: "different" },
        'SAM_AUTHORIZATION="secret"',
      ),
    SamSetupError,
  );
  assert.throws(
    () =>
      readSamConfig(
        { SAM_AUTHORIZATION: "secret" },
        'SAM_ACCOUNT_ID="different"',
      ),
    SamSetupError,
  );
  assert.deepEqual(
    readSamConfig(
      { SAM_ACCOUNT_ID: "process", SAM_AUTHORIZATION: "Basic ZmFrZQ==" },
      "SAM_ACCOUNT_ID=file",
    ),
    {
      accountId: "process",
      authorization: "Basic ZmFrZQ==",
    },
  );
});

test("missing setup reports only static instructions without any supplied secret", () => {
  for (const values of [
    {},
    { SAM_ACCOUNT_ID: "secret-account" },
    { EXPO_PUBLIC_SAM_AUTHORIZATION: "secret-token" },
  ]) {
    assert.throws(
      () => readSamConfig(values),
      (error: unknown) => {
        assert.ok(error instanceof SamSetupError);
        assert.doesNotMatch(error.message, /secret-account|secret-token/);
        return true;
      },
    );
  }
});
