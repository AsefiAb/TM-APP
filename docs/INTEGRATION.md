# SAM AI integration plan

Status: **SAM 0.2 local prototype; not connected to production accounts; not published to either store.** The current product reference is [SAM AI at sam3.txhd.io](https://sam3.txhd.io/), inspected with the user's authorization on October 6, 2026. The app's fictional data and local actions are not evidence of real message delivery, account access, AI generation, campaign execution, or billing activity.

The mobile priority is owner productivity: campaigns, inbox, and billing. Home provides direct actions for this work; Audience supports targeting, and Writer assists within campaign creation. The five destinations are Home, Campaigns, Inbox, Audience, and Billing. Live campaign and inbox access, the billing contract, and native authentication must be verified before these local workflows become account-connected features.

## Current SAM workspace observations

The authenticated SAM3 walkthrough confirmed a four-step Writer, campaign controls for SMS/MMS/RCS, Help, Take Tour, and FastTrack. These are visible product workflows, not proof of API equivalence, account entitlement, or successful delivery. The mobile demo deliberately uses an SMS workflow; it does not implement MMS uploads, RCS delivery, or a live AI model.

The SAM workspace exposes API information and an SSO link. Keys remained masked; no credentials or private account identifiers were copied into source or documentation. The existence of these controls does not verify OAuth/OIDC availability, mobile redirect handling, token scope, or a native sign-in endpoint. A logged-in browser session is not a native-app session.

Profile → Account settings was verified at `https://sam3.txhd.io/account-settings`. Its Account & Billing area exposed Account Information, API Information, and Users. No billing ledger, payment controls, or plan pricing was visible for the inspected unprovisioned account. The mobile link is therefore labeled **Open SAM account settings** and targets that verified page; it does not claim to open an observed payment portal. No private account data was retained.

**Provisioning observations:** the initial walkthrough's Send Campaign control on `sam3.txhd.io/campaigns` displayed an account-not-provisioned message requiring support assistance. The later API check in run `37544172541` now lists a provisioned sender entry. The campaign UI has not been rechecked; an entry alone does not establish outbound SMS permission or delivery. Confirm sender capability before an authorized end-to-end sending test. No customer message was sent.

This repository records generic workflow observations only. Private account identifiers, contact names, customer messages, credentials, and account metrics remain outside the source and documentation.

## Directly reviewed API v1 documentation

Textmunication's public [Solutions](https://www.textmunication.com/solutions), [SAM AI](https://www.textmunication.com/sam-ai), and [developer](https://www.textmunication.com/developers) pages provide broader product and REST/webhook background. Public advertising alone does not establish availability in a given SAM account.

The complete rendered official [Textmunication API v1 documentation](https://txhd.io/api/v1/docs/) was successfully read in the browser on October 6, 2026. This supersedes the earlier search-index-only evidence; an HTTP 403 from another retrieval tool did not prevent direct browser review. The documentation specifies **Basic authorization**. The table below uses paths relative to `https://txhd.io/api/v1`.

| Mobile capability           | Documented API v1 route and contract                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create/send a campaign      | `POST /campaign/create/send`; documented fields include `name`, `body`, `type` (`IMMEDIATE` or `SCHEDULED`), `groupIds`, `from`, and `scheduledTime`    |
| Modify a scheduled campaign | `POST /campaign/modifycampaign?source=api`                                                                                                              |
| Cancel a scheduled campaign | `POST /campaign/deletecampaign/{id}`                                                                                                                    |
| Campaign list and reporting | `GET /campaign/list?filter=PAST` or `SCHEDULED`; `GET /campaign/getCampaignReport/{campaignId}`                                                         |
| Direct SMS/reply            | `POST /text/send`                                                                                                                                       |
| Incoming messages           | `GET /reporting/mo/:accountId/{timeRange}` with documented `Page` parameter; `result.mobileOriginatedMessages` contains `from`, `body`, and `timestamp` |
| Audience groups             | `GET /reporting/groups/:accountId`                                                                                                                      |
| Subscribers                 | `GET /reporting/subscriber/getsubscribers/:accountId`; supports `groupId`, `page`, `pageSize` from 10 to 1000, and `usable`                             |
| Account information         | `GET /account/info/{accountId}`; includes `authToken`, `ssoUrl`, and `provisionedCodes`                                                                 |
| Incoming/delivery webhooks  | `POST /account/webhooks/insertupdate/:accountId`; supports `MO` and `DR`, with an optional token                                                        |

These are documented capabilities. The six read operations listed in the live verification below have now passed against this SAM3 account. No message was sent; campaign mutations, reports beyond the sampled lists, webhook delivery, sending entitlement, schedule timezone, and production delivery behavior remain unverified.

### What the documentation does not establish

- No native customer login, OAuth flow, refresh-token/session API, billing-plan/invoice/payment API, or Writer generation endpoint was found in the reviewed documentation navigation. These require separate approved contracts.
- Incoming-message results do not provide documented conversation IDs or read/unread state. The mobile backend needs an explicit threading, identity, and read-state design rather than assuming the demo's conversation model maps directly to those results.
- Subscriber fields such as `nextBillingDate` and `isPastDue` describe member/customer CRM records. They are not the merchant's SAM subscription or account billing data.
- Account information contains credentials and an SSO URL. The backend must return an allowlisted mobile-safe projection, never forward the full provider response or expose `authToken`/`ssoUrl` in the client, logs, or examples.
- The webhook token is documented as optional; no cryptographic signature scheme was established by this review. Verify how to authenticate and validate actual webhook requests.
- The SMS documentation states 160 characters for the US and 140 for Canada. The demo's 1,600-character editor and generic segment estimate are not proof that a production request supports that length. Confirm provider limits, concatenation, encoding, and recipient-country behavior before enabling delivery.

## Implemented server read adapter

The repository now contains `server/sam-client.ts`, a server-only API v1 adapter for account information, groups, campaign lists, incoming messages, and subscribers. The manually triggered **Check SAM API connection** GitHub workflow runs `npm run api:check` on `main` when authorized repository secrets are configured. See [Connect your SAM account](CONNECT-SAM.md) for setup.

The owner setup uses GitHub repository secrets named `SAM_ACCOUNT_ID` and `SAM_AUTHORIZATION`, populated from the corresponding SAM API Information fields. The workflow passes them as environment values only to its read-only check step; install, ordinary test, and export steps do not receive them. The authorization value accepts the complete copied Basic header or its bare base64 value. `server/config.ts` does not derive credentials from a guessed username/password pair. Optional local development can use the Git-ignored `server/.env.local`, but the owner does not need that file. The CLI checks six reads: account, groups, past campaigns, scheduled campaigns, today's first incoming-message page, and the first 10 usable subscribers of the first existing group. A usable subscriber response is not proof of consent to send.

Output is limited to status labels, static guidance, and safe HTTP-status or field-type diagnostics, with no account identifiers, names, message bodies, counts, credentials, or raw provider errors. Failed account access skips the other checks; authentication and rate-limit failures stop subsequent requests; no available group leaves contacts skipped. Exit codes are `0` for all six passing, `1` for failure, and `2` for a skipped check without a failure. The final summary explicitly leaves sending, native sign-in, billing, live Writer, and full inbox sync untested.

The adapter fixes the provider origin, rejects redirects, times out requests, and does not automatically retry. Account information is projected through an allowlist that excludes provider credentials and SSO URLs. Simulated-response tests check local behavior separately from the live verification below.

This is implemented integration groundwork, not a deployed mobile backend. The native app still uses local fictional data. Sending, campaign mutations, native customer authentication, billing, and live Writer remain outside the read adapter. GitHub repository secrets configure this manual diagnostic workflow, not a runtime backend or the phone app. Credentials remained in GitHub secrets and were not copied locally or embedded in the mobile app. A deployed service will need its own secret storage, never Expo public variables or an app-bundled key.

### Live read verification — October 6, 2026

[GitHub Actions run 37544172541](https://github.com/AsefiAb/TM-APP/actions/runs/37544172541) succeeded at commit `08b743b`. All six checks passed: account information, groups, past campaigns, scheduled campaigns, today's first incoming-message page, and the first subscriber page of one existing group. Output stayed sanitized. The account now lists a provisioned sender entry, whereas the earlier successful run `37542082054` returned none. The checker tests only whether `provisionedCodes` is nonempty; it does not establish outbound SMS capability, registration, or delivery. No SMS was sent.

The successful run followed two local adapter corrections: accepting HTTP 202 specifically for campaign lists after response JSON validation, and accepting an explicitly terminal empty incoming-message collection without pagination metadata or an invented page size. Earlier checker failures reflected these compatibility gaps, not established failures of SAM's external service. All 52 local tests, TypeScript checking, and lint passed after the changes.

This verifies authentication and the sampled read shapes. Empty and sampled responses do not prove populated multi-page data, complete inbox synchronization, cross-business production authorization, native customer login, merchant billing, live Writer, or sending. The app remains a local demo until its authenticated backend and mobile data integration are implemented.

## Proposed connected architecture — not a deployed service

```text
iOS / Android app
    │ HTTPS + short-lived user session
    ▼
Textmunication-owned mobile backend
    ├── identity, organization membership and role checks
    ├── consent, recipient validation and send approval
    ├── idempotent jobs, audit events and webhook processing
    ├── owner-authorized billing reads and approved provider portal access
    ├── approved Writer service with explicit user review
    └── server-held provider credentials → approved SAM API
```

The read adapter implements only the provider-access portion of this proposed architecture. The authenticated mobile backend, business authorization, and delivery services must still be implemented and deployed before real account data, billing, AI generation, or sending can be enabled in the app. This diagram does not claim that SAM already exposes native mobile endpoints. Provider secrets belong on the backend; do not ship them in the mobile app. The current Writer is deterministic offline template assistance using only supplied details.

### Authentication and organization isolation

- Agree on an existing identity-provider integration or approved first-party login with the Textmunication team. If OAuth/OIDC is available, use authorization code with PKCE and verified redirect URIs. Do not invent or scrape a private login endpoint.
- Keep API secrets in server secret storage. Expo public environment variables, JavaScript bundles, source control, screenshots, and logs must never contain provider tokens or credentials.
- Project account information through a server-side allowlist. In particular, do not pass the provider's `authToken` or `ssoUrl` through to the mobile account view.
- Issue short-lived mobile access tokens, rotate and revoke refresh sessions, store refresh credentials in platform secure storage, and clear sensitive caches on logout. Real customer messages must not inherit the demo's ordinary local-storage strategy.
- Resolve authorized organizations from the authenticated server identity. Check organization, account, sender number, conversation, contact, group, campaign, attachment, and role on every request. A client-supplied account ID or hidden UI button is not authorization.
- Partition database queries, caches, jobs, and push registrations by tenant. Test two users from different organizations against each other's object IDs. Provide explicit organization switching if the account supports multiple businesses.

### Sending and consent enforcement

- Recheck recipient consent and provider suppression state on the server immediately before every real send, including scheduled jobs and replies. Record the applicable consent evidence, source, timestamp, sender, and purpose. The prototype's consent badge or checkbox is not sufficient proof.
- Apply the business's approved messaging rules for opt-outs, quiet hours, jurisdiction, sender registration, content, and frequency. Show recipient count, sender, message, timing, and estimated usage before confirmation. The backend remains authoritative when client values disagree.
- Create a durable send job with an idempotency key. Retry provider calls only with an understood duplicate-prevention strategy; reconcile uncertain outcomes before resending. An accepted request is not a delivered message.
- Preserve provider identifiers and explicit queued, sent, delivered, failed, and canceled states. Confirm that cancellation reached the provider before reporting success. Do not infer SMS opens from delivery receipts.
- Validate attachment type, size, and ownership server-side. Use expiring access URLs; avoid public storage of customer media.

### Incoming events and data handling

Verify the provider's actual webhook authentication mechanism before accepting events. Authenticate, deduplicate, map to the correct tenant, reject replays where supported, and handle delayed/out-of-order updates. Reconcile with provider reporting after outages. A webhook URL alone does not prove an event is authentic.

The reviewed API supports `MO` and `DR` webhook registration with an optional token. This does not establish signed requests. Incoming-message polling provides sender, body, and timestamp but no documented thread or read-state IDs; define backend threading and deduplication explicitly and verify outbound-history reconciliation before presenting a complete inbox.

Minimize retained customer data, redact message bodies and tokens from operational logs, define retention/deletion/export behavior, and record access/send audit events. Send push notifications only to authorized account devices; default to minimal lock-screen content. Push delivery requires separately configured native credentials and real-device testing.

### Welcome and session boundary

`src/access.tsx` currently holds an in-memory `welcome` / `demo` choice. The root layout gates every workspace route behind explicit demo entry. Opening SAM in the browser does not set an authenticated state; no password field, token storage, callback, or unverified auth endpoint is implemented. Leaving the demo unmounts its provider and returns to welcome without deleting local fictional drafts. Reloading the app returns to welcome. This is a preview entry boundary, not a security control for real data.

Production requires SAM's approved mobile login/SSO contract: an OIDC authorization-code/PKCE configuration or an approved session-exchange flow; redirect registration; refresh, expiry, logout and revocation behavior; and user-to-business/role mapping. Deploy the business-controlled HTTPS backend and runtime secret storage separately from GitHub's diagnostic workflow. Only then add secure native session storage, server-enforced tenant authorization, cache clearing on logout/account change, and real account data. Never promote the local demo choice or browser session into an authenticated identity.

### Billing integration

The Billing tab currently uses demonstration information. Sample plan details, balances, usage, invoices, and payment-method references are not assertions about the user's SAM account. No charge, purchase, subscription modification, card update, or invoice payment is performed by the demo.

Obtain the current billing contract from the SAM team before connecting the view. Verify the authoritative provider, owner permissions, organization mapping, currency and amount units, usage period, invoice status, and allowed portal actions. No native billing endpoint or hosted payment flow has been assumed. A link to the full SAM website opens a separate web session; it does not synchronize account data into the app.

The directly reviewed API v1 documentation does not provide merchant plan, invoice, or payment endpoints. Subscriber-level `nextBillingDate` and `isPastDue` fields belong to CRM/member records and must not populate the owner's SAM Billing screen.

Start with authenticated read-only account and invoice data. Enforce billing permissions on the server and scope every record to the current business. If account management later uses a provider portal, generate it through the approved backend flow and reflect confirmed provider results. Keep card details and billing credentials outside the app's local demo storage. Review any purchase or upgrade flow against the [release requirements](RELEASE.md) before adding it.

### Offers and redemption

The guided offer helper produces editable campaign wording only. Examples are explicitly selected by the owner; offer value, scope, expiration, and terms remain reviewable. In-person wording asks staff to verify the offer before checkout. Optional online wording uses an owner-supplied HTTPS checkout link and existing promotion code, with an acknowledgement that the code was created and tested outside this app. That acknowledgement is not provider verification. Neither path creates a real coupon, changes a register, applies a discount, or enforces one redemption per customer.

The repeat-use walkthrough is a local interactive example with a fictional code and resettable state. It is not security enforcement. Production one-use offers need business-scoped offer definitions, expiry and eligibility rules, unpredictable recipient-specific tokens stored safely on the backend, authorized staff verification, and an atomic redemption transition with an audit record. Client state, screenshots, QR images, shared codes, and a printed "one per customer" condition cannot be the authority. Verify recipient identity where offers are nontransferable; an unused token can still be forwarded. Expired, already-used, revoked, or wrong-business codes must fail before any discount is applied. Offline redemption cannot promise immediate protection against reuse across devices.

When the backend exists, separate offer creation, individual coupon issuance, customer presentation, staff verification, and redemption. Verify any checkout or point-of-sale integration with the merchant's actual provider. If applying a discount and consuming a code happen in separate systems, define retries and reconciliation so neither a failed checkout nor a retried request incorrectly consumes or duplicates the offer. No production coupon service or POS integration is currently implemented or verified.

## Delivery sequence

1. **Complete account setup:** the SAM3 walkthrough, documentation review, server read adapter, and six live read checks are complete. A provisioned sender is now listed; confirm outbound SMS capability and production limits. Obtain the separate native sign-in, merchant billing, and Writer contracts and a business-controlled backend hosting target. Rerun **Check SAM API connection** on `main` when API access changes; it does not establish sending or mobile sign-in. The user enters credentials through the service's own login interface.
2. **Read-only staging:** implement sign-in, tenant authorization, inbox, contact/consent, campaign reporting, and owner-scoped billing adapters. Verify pagination, empty states, permission failures, expiry, and network recovery with synthetic data.
3. **Controlled sending:** add preview and explicit confirmation, server consent checks, idempotent jobs, webhook reconciliation and audit records. Test only with designated consenting test recipients.
4. **Pilot:** enable a small authorized group, monitoring, incident ownership and a server-side send kill switch. Verify account deletion, session revocation and tenant isolation.
5. **Store candidate:** complete [release requirements](RELEASE.md), signed native-device tests, review access and accurate privacy declarations. Keep demo and production data clearly separated.

Do not turn the connection status to “connected” or remove demo labels solely because a URL or token was entered. Require a successful authenticated health/account check and tested adapter behavior.
