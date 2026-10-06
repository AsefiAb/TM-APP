import { SamApiError, type SamClient } from "./sam-client";

export type ConnectionCheck = {
  feature: string;
  status: "PASS" | "FAIL" | "SKIPPED";
  detail: string;
};

type ReadClient = Pick<
  SamClient,
  | "getAccount"
  | "listGroups"
  | "listCampaigns"
  | "listIncoming"
  | "listSubscribers"
>;

export function safeFailure(error: unknown): string {
  if (!(error instanceof SamApiError))
    return "Unexpected local error. No provider response or credentials were logged.";
  const explanations: Record<SamApiError["code"], string> = {
    config:
      "Check SAM_ACCOUNT_ID and SAM_AUTHORIZATION in the GitHub Actions secrets or server environment.",
    auth: "SAM rejected access. Confirm the API key, account, and permissions with the SAM team.",
    missing:
      "SAM did not find this route. Confirm API v1 access for this SAM account.",
    rate_limit: "SAM rate limit reached. Wait before trying again.",
    server: "SAM reported a server error. Retry later or contact the SAM team.",
    http: "SAM rejected the request. Confirm the documented API contract with the SAM team.",
    schema:
      "SAM returned a different data format. The adapter needs review before connecting the app.",
    provider:
      "SAM returned an application error. Ask the SAM team to review this account and route.",
    timeout: "SAM did not respond within the time limit.",
    network:
      "Could not reach SAM securely. Check the network; redirects are not followed.",
  };
  const httpStatus =
    Number.isInteger(error.status) &&
    error.status! >= 100 &&
    error.status! <= 599
      ? ` HTTP ${error.status}.`
      : "";
  const diagnostic = error.diagnostic ? ` ${error.diagnostic}` : "";
  return explanations[error.code] + httpStatus + diagnostic;
}

/** Fixed read-only checks. Output contains neither account records nor provider text. */
export async function checkConnections(
  client: ReadClient,
): Promise<ConnectionCheck[]> {
  const results: ConnectionCheck[] = [];
  const dependentFeatures = [
    "Audience groups",
    "Past campaigns",
    "Scheduled campaigns",
    "Incoming messages",
    "Contacts",
  ];
  let stopped = false;
  async function check<T>(
    feature: string,
    action: () => Promise<T>,
    summarize: (data: T) => string,
  ): Promise<T | undefined> {
    if (stopped) {
      results.push({
        feature,
        status: "SKIPPED",
        detail:
          "Resolve the earlier account-access or rate-limit failure first.",
      });
      return undefined;
    }
    try {
      const value = await action();
      results.push({ feature, status: "PASS", detail: summarize(value) });
      return value;
    } catch (error) {
      results.push({ feature, status: "FAIL", detail: safeFailure(error) });
      if (
        error instanceof SamApiError &&
        ["auth", "rate_limit"].includes(error.code)
      )
        stopped = true;
      return undefined;
    }
  }
  const account = await check(
    "Account",
    () => client.getAccount(),
    (value) =>
      value.provisionedCodes.length > 0
        ? "Account format verified. Sender numbers are listed; sending has not been tested."
        : "Account format verified. No sender number returned; ask SAM to enable sending.",
  );
  if (!account) {
    results.push(
      ...dependentFeatures.map(
        (feature): ConnectionCheck => ({
          feature,
          status: "SKIPPED",
          detail: "Verify account access before checking business data.",
        }),
      ),
    );
    return results;
  }
  const groups = await check(
    "Audience groups",
    () => client.listGroups(),
    () => "Group-list format verified.",
  );
  await check(
    "Past campaigns",
    () => client.listCampaigns("PAST"),
    () => "Campaign-list format verified.",
  );
  await check(
    "Scheduled campaigns",
    () => client.listCampaigns("SCHEDULED"),
    () => "Campaign-list format verified.",
  );
  await check(
    "Incoming messages",
    () => client.listIncoming("today", 1),
    () =>
      "First page for today verified. Full conversation history has not been assembled.",
  );
  if (groups?.length) {
    await check(
      "Contacts",
      () =>
        client.listSubscribers({
          groupId: groups[0].id,
          page: 1,
          pageSize: 10,
          usable: true,
        }),
      () =>
        "First page of one group verified. This does not establish consent to send.",
    );
  } else {
    results.push({
      feature: "Contacts",
      status: "SKIPPED",
      detail:
        "A valid existing group is needed to check the subscribers endpoint.",
    });
  }
  return results;
}
