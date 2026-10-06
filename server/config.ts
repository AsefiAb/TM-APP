import { parseEnv } from "node:util";

export class SamSetupError extends Error {
  constructor() {
    super(
      "Add your API Account ID and Authorization Header to server/.env.local, then run npm run api:check again. Do not paste them in chat or GitHub.",
    );
    this.name = "SamSetupError";
  }
}

/** Read only the dedicated server configuration; never Expo's public environment. */
export function readSamConfig(
  environment: Record<string, string | undefined>,
  localContents?: string,
): { accountId: string; authorization: string } {
  let values: Record<string, string | undefined>;
  if (
    environment.SAM_ACCOUNT_ID !== undefined ||
    environment.SAM_AUTHORIZATION !== undefined
  ) {
    // Treat the two process values as a pair; do not mix accounts across sources.
    values = environment;
  } else {
    try {
      values = parseEnv(localContents ?? "");
    } catch {
      throw new SamSetupError();
    }
  }
  const accountId = values.SAM_ACCOUNT_ID?.trim();
  const copiedAuthorization = values.SAM_AUTHORIZATION?.trim();
  if (!accountId || !copiedAuthorization) throw new SamSetupError();
  // The SAM copy control may include the scheme or just its base64 token.
  const authorization = /^Basic /i.test(copiedAuthorization)
    ? copiedAuthorization.replace(/^Basic /i, "Basic ")
    : `Basic ${copiedAuthorization}`;
  return { accountId, authorization };
}
