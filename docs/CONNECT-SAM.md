# Connect your SAM account

The repository now has a server-side API adapter and a read-only connection check. The mobile app still opens its local demo; completing this check will not sign the app in, send messages, or connect billing.

## Your next steps

1. **Fill in the local setup file.** Open `server/.env.local`. Under SAM → Account settings → API Information, copy the API Account ID into `SAM_ACCOUNT_ID` and the Authorization Header / API Key value into `SAM_AUTHORIZATION`. Keep the quotation marks. The copied value can include `Basic ` or be the bare base64 value; the checker accepts either. Do not substitute your website password. On a fresh clone, copy `server/.env.example` to `server/.env.local` first; preserve an existing configured file. The local file is excluded from Git.
2. **Check the connection.** With Node.js 24 and the project's dependencies installed, run `npm run api:check` from the repository folder. This checks the documented read endpoints; it does not send, schedule, edit, or delete a campaign.
3. **Read the short result.** `PASS` means that read operation succeeded and its response format matched the adapter. `FAIL` gives a static next step. `SKIPPED` means the check could not run yet. If the account lists no sender number, ask SAM to enable sending. Share the checker's status output if help is needed, not the setup file or credentials. The app still needs its approved customer-login connection before real data can appear on a phone.

The local file has these two fields:

```dotenv
SAM_ACCOUNT_ID=""
SAM_AUTHORIZATION=""
```

Paste credentials only into that local file, never into chat, an `EXPO_PUBLIC_*` variable, or source control.

No live check has been completed yet because no server-side credential is configured. Local tests use simulated provider responses and cannot establish that the real account can send.

## What the checker reads

The command checks account information, audience groups, past campaigns, scheduled campaigns, today's first incoming-message page, and the first 10 usable subscribers from the first existing group. It prints only `PASS`, `FAIL`, or `SKIPPED` with feature labels and static guidance; it does not print account identifiers, names, message bodies, counts, credentials, or raw provider errors.

If account access fails, the remaining checks are skipped. Authentication and rate-limit failures stop subsequent requests. Contacts are skipped when no existing group is available. The final line explicitly leaves sending, customer sign-in, billing, live Writer, and complete inbox synchronization **not tested**. Even six passes do not connect the mobile demo or certify production readiness.

## What the SAM team still needs to provide

- Confirm API v1 access and resolve the account-not-provisioned message seen in the SAM campaign screen.
- Provide the approved customer sign-in/session contract for the native app.
- Provide the merchant billing contract for plan, credits, invoices, and any account-management portal. Subscriber/member CRM billing fields are not the business owner's SAM billing.

Those are the remaining account and service dependencies. The [integration plan](INTEGRATION.md) records the documented routes and live-service gaps. The [release guide](RELEASE.md) covers signed builds and store submission after the connected app is ready.

## Developer notes

`server/sam-client.ts` is a server-only adapter for account information, groups, campaign lists, incoming messages, and subscribers. It uses the documented API v1 origin and Basic authorization. Requests reject redirects, have a timeout, and do not automatically retry. The account response is projected through an allowlist so provider credentials and SSO URLs do not reach consumers.

`server/config.ts` reads the two dedicated server values; process environment values take precedence as a pair over `server/.env.local`. `server/checks.ts` defines the read sequence, and `server/check-sam.ts` is the command entry point. Exit code `0` means all six checks passed, `1` means a setup/check failure, and `2` means no failures but at least one skipped check. `npm test` includes local adapter and checker tests without provider credentials.

The connection check must remain read-only. Campaign creation/sending, scheduled-campaign changes, cancellation, and direct replies are documented provider capabilities, but are not implemented as live operations by this read adapter. No external endpoint failure has been observed or repaired.

The mobile application does not import the server adapter. Connecting the app requires a deployed backend, approved customer authentication, business-scoped authorization, and mobile-safe response models. Keep the provider credential on that backend. No provider secrets are configured in GitHub Actions.

For the inbox, API v1 supplies incoming message sender, body, and timestamp, without documented conversation IDs or read state. Define threading and read-state ownership on the backend before replacing the demo conversation model. Confirm production message limits, encoding, consent, and sender provisioning before implementing delivery; a successful read check is not a sending test.
