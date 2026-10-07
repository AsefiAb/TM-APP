# Connect your SAM account

The repository has a server-side API adapter and a read-only connection check that runs from GitHub. You do not need a local credentials file for this setup. The mobile app opens a welcome screen with an explicit demo option; completing the check will not sign the app in, send messages, or connect billing. **Open SAM sign-in** opens SAM's separate website and does not establish a mobile session.

## Verified connection

[GitHub run 37544172541](https://github.com/AsefiAb/TM-APP/actions/runs/37544172541) succeeded on October 6, 2026 at commit `08b743b`: all six checks passed for account information, groups, past campaigns, scheduled campaigns, today's first incoming-message page, and the first subscriber page of one group. Authentication and those sampled reads are verified. No SMS was sent.

The account now lists a provisioned sender entry, resolving the earlier missing-sender observation. A listed entry does not establish outbound SMS permission or delivery. Empty and sampled responses do not verify populated pagination, a complete synchronized inbox, customer sign-in, merchant billing, or live Writer. The mobile app remains a demo. The credentials stayed in GitHub secrets; they were not copied locally or embedded in the mobile app.

## Your next steps

The simplest handoff to your SAM developer is: **“Please send the supported mobile login integration and give us access to deploy the app's backend.”** The API key already added to GitHub is separate from customer login.

1. Ask your SAM developer how the mobile app should sign a business owner in and retrieve that business's plan, credits, and invoices. Share those API documents or an integration contact; the reviewed API v1 documentation does not cover these features.
2. Confirm where Textmunication wants the app's backend hosted. GitHub secrets protect the connection checker, but a running backend is still needed to connect the phone app safely.
3. For a later sending test, confirm the listed sender supports outbound SMS and the production message limits. Designate one consenting test recipient and approve the exact test message before any send. Sending code is not yet implemented.

No additional GitHub secrets are needed for the current read checks.

## Run the check again or change API access

The two repository secrets are already configured for the verified run. Use these instructions when updating access or setting up another authorized deployment:

1. **Save two GitHub secrets.** In [TM-APP repository settings](https://github.com/AsefiAb/TM-APP/settings/secrets/actions), open **Secrets and variables → Actions → New repository secret**. Add the two names below using the corresponding values from SAM → Account settings → API Information. Do not substitute your website password.
2. **Run the check.** Open the repository's **Actions → Check SAM API connection → Run workflow**, select **main**, and run it. This manual workflow checks the documented read endpoints; it does not send, schedule, edit, or delete a campaign.
3. **Read the result.** Open that workflow run's connection-check output. `PASS` means that read operation succeeded and its response format matched the adapter. `FAIL` gives a static next step. `SKIPPED` means the check could not run yet. If the account lists no sender number, ask SAM to enable sending. Share the checker's status output if help is needed, not the secret values. The app still needs its approved customer-login connection before real data can appear on a phone.

| Repository secret name | Value to copy from SAM API Information |
| ---------------------- | -------------------------------------- |
| `SAM_ACCOUNT_ID`       | API Account ID                         |
| `SAM_AUTHORIZATION`    | Authorization Header / API Key value   |

The authorization value can include `Basic ` or be the bare base64 value; the checker accepts either. Paste the copied value as the secret value, without adding quotation marks.

Keep credentials in GitHub's secret-value fields, not in chat, repository files, workflow text, or an `EXPO_PUBLIC_*` variable. The workflow passes the two secrets only to the connection-check step; dependency installation, ordinary tests, and app exports do not receive them.

The adapter changes also passed 52 local tests, TypeScript checking, and lint. Those tests use simulated provider responses and are distinct from the successful live read check above; neither establishes that the real account can send.

## What the checker reads

The GitHub workflow runs `npm run api:check`. It checks account information, audience groups, past campaigns, scheduled campaigns, today's first incoming-message page, and the first 10 usable subscribers from the first existing group. It prints `PASS`, `FAIL`, or `SKIPPED` with feature labels, static guidance, and safe HTTP-status or field-type diagnostics when needed. It does not print account identifiers, names, message bodies, counts, credentials, or raw provider errors.

If account access fails, the remaining checks are skipped. Authentication and rate-limit failures stop subsequent requests. Contacts are skipped when no existing group is available. The final line explicitly leaves sending, customer sign-in, billing, live Writer, and complete inbox synchronization **not tested**. Even six passes do not connect the mobile demo or certify production readiness.

## What the SAM team still needs to provide

- Confirm outbound SMS capability and production message limits for the now-listed sender. Sampled API v1 read access has already passed; sending and delivery have not been tested.
- Provide the approved customer sign-in/session contract for the native app.
- Provide the merchant billing contract for plan, credits, invoices, and any account-management portal. Subscriber/member CRM billing fields are not the business owner's SAM billing.

Those are the remaining account and service dependencies. The [integration plan](INTEGRATION.md) records the documented routes and live-service gaps. The [release guide](RELEASE.md) covers signed builds and store submission after the connected app is ready.

## Developer notes

`server/sam-client.ts` is a server-only adapter for account information, groups, campaign lists, incoming messages, and subscribers. It uses the documented API v1 origin and Basic authorization. Requests reject redirects, have a timeout, and do not automatically retry. The account response is projected through an allowlist so provider credentials and SSO URLs do not reach consumers.

`server/config.ts` reads the two dedicated server values; process environment values take precedence as a pair over `server/.env.local`. `server/checks.ts` defines the read sequence, and `server/check-sam.ts` is the command entry point. Exit code `0` means all six checks passed, `1` means a setup/check failure, and `2` means no failures but at least one skipped check. `npm test` includes local adapter and checker tests without provider credentials.

`.github/workflows/sam-api-check.yml` is manually triggered and restricted to `main`. It supplies `SAM_ACCOUNT_ID` and `SAM_AUTHORIZATION` from repository secrets only to the check step. It does not run automatically for pushes or pull requests and does not deploy a backend.

The connection check remains read-only. Campaign creation/sending, scheduled-campaign changes, cancellation, and direct replies are documented provider capabilities, but are not implemented as live operations by this read adapter. Live verification exposed two adapter compatibility issues that were corrected: campaign lists accept HTTP 202 only when their response JSON validates, and explicitly terminal empty incoming-message collections may omit pagination metadata without inventing a page size. These were local adapter fixes, not repairs to SAM's external service.

The mobile application does not import the server adapter. Connecting the app requires a deployed backend, approved customer authentication, business-scoped authorization, and mobile-safe response models. GitHub secrets make credentials available to this diagnostic workflow; they do not configure a running backend or connect the phone app. Configure the deployed backend's secret storage separately when that service exists.

For the inbox, API v1 supplies incoming message sender, body, and timestamp, without documented conversation IDs or read state. Define threading and read-state ownership on the backend before replacing the demo conversation model. Confirm production message limits, encoding, consent, and sender provisioning before implementing delivery; a successful read check is not a sending test.

### Optional local development

Developers using Node.js 24 can copy `server/.env.example` to the Git-ignored `server/.env.local`, preserve its quotation marks, enter the same two values, and run `npm run api:check` locally after installing dependencies. Keep an existing configured local file. This is optional; the owner setup above uses GitHub secrets instead.
