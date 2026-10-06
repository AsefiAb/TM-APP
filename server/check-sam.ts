import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SamClient } from "./sam-client";
import { readSamConfig, SamSetupError } from "./config";
import { checkConnections, safeFailure } from "./checks";

async function main() {
  let localContents: string | undefined;
  if (
    process.env.SAM_ACCOUNT_ID === undefined &&
    process.env.SAM_AUTHORIZATION === undefined
  ) {
    try {
      localContents = await readFile(
        resolve(process.cwd(), "server/.env.local"),
        "utf8",
      );
    } catch {
      throw new SamSetupError();
    }
  }
  const client = new SamClient(readSamConfig(process.env, localContents));
  console.log(
    "SAM read-only connection check. No messages will be sent and no settings will change.",
  );
  const results = await checkConnections(client);
  for (const result of results)
    console.log(`${result.status} | ${result.feature} | ${result.detail}`);
  console.log(
    "NOT TESTED | Sending, customer sign-in, billing, live Writer, and complete inbox synchronization.",
  );
  console.log(
    "These checks do not connect the mobile demo or certify production readiness.",
  );
  process.exitCode = results.some((result) => result.status === "FAIL")
    ? 1
    : results.some((result) => result.status === "SKIPPED")
      ? 2
      : 0;
}

main().catch((error: unknown) => {
  console.error(
    error instanceof SamSetupError ? error.message : safeFailure(error),
  );
  process.exitCode = 1;
});
