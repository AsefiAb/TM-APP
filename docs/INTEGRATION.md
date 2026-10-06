# SAM AI integration plan

Status: **SAM 0.2 local prototype; not connected to production accounts; not published to either store.** The current product reference is [SAM AI at sam3.txhd.io](https://sam3.txhd.io/), inspected with the user's authorization on October 6, 2026. The app's fictional data and local actions are not evidence of real message delivery, account access, AI generation, campaign execution, or billing activity.

The mobile priority is owner productivity: campaigns, inbox, and billing. Home provides direct actions for this work; Audience supports targeting, and Writer assists within campaign creation. The five destinations are Home, Campaigns, Inbox, Audience, and Billing. Live campaign and inbox access, the billing contract, and native authentication must be verified before these local workflows become account-connected features.

## Current SAM workspace observations

The authenticated SAM3 walkthrough confirmed a four-step Writer, campaign controls for SMS/MMS/RCS, Help, Take Tour, and FastTrack. These are visible product workflows, not proof of API equivalence, account entitlement, or successful delivery. The mobile demo deliberately uses an SMS workflow; it does not implement MMS uploads, RCS delivery, or a live AI model.

The SAM workspace exposes API information and an SSO link. Keys remained masked; no credentials or private account identifiers were copied into source or documentation. The existence of these controls does not verify OAuth/OIDC availability, mobile redirect handling, token scope, or a native sign-in endpoint. A logged-in browser session is not a native-app session.

Profile → Account settings was verified at `https://sam3.txhd.io/account-settings`. Its Account & Billing area exposed Account Information, API Information, and Users. No billing ledger, payment controls, or plan pricing was visible for the inspected unprovisioned account. The mobile link is therefore labeled **Open SAM account settings** and targets that verified page; it does not claim to open an observed payment portal. No private account data was retained.

**Current SAM provisioning dependency:** opening Send Campaign on `sam3.txhd.io/campaigns` displayed an account-not-provisioned message requiring support assistance. This was observed in the new SAM workspace, not inferred from the earlier platform. Resolve it with Textmunication support before an end-to-end sending test. No customer message was sent during the walkthrough.

This repository records generic workflow observations only. Private account identifiers, contact names, customer messages, credentials, and account metrics remain outside the source and documentation.

## Directly reviewed API v1 documentation

Textmunication's public [Solutions](https://www.textmunication.com/solutions), [SAM AI](https://www.textmunication.com/sam-ai), and [developer](https://www.textmunication.com/developers) pages provide broader product and REST/webhook background. Public advertising alone does not establish availability in a given SAM account.

The complete rendered official [Textmunication API v1 documentation](https://txhd.io/api/v1/docs/) was successfully read in the browser on October 6, 2026. This supersedes the earlier search-index-only evidence; an HTTP 403 from another retrieval tool did not prevent direct browser review. The documentation specifies **Basic authorization**. The table below uses paths relative to `https://txhd.io/api/v1`.

| Mobile capability | Documented API v1 route and contract |
| --- | --- |
| Create/send a campaign | `POST /campaign/create/send`; documented fields include `name`, `body`, `type` (`IMMEDIATE` or `SCHEDULED`), `groupIds`, `from`, and `scheduledTime` |
| Modify a scheduled campaign | `POST /campaign/modifycampaign?source=api` |
| Cancel a scheduled campaign | `POST /campaign/deletecampaign/{id}` |
| Campaign list and reporting | `GET /campaign/list?filter=PAST` or `SCHEDULED`; `GET /campaign/getCampaignReport/{campaignId}` |
| Direct SMS/reply | `POST /text/send` |
| Incoming messages | `GET /reporting/mo/:accountId/{timeRange}` with documented `Page` parameter; `result.mobileOriginatedMessages` contains `from`, `body`, and `timestamp` |
| Audience groups | `GET /reporting/groups/:accountId` |
| Subscribers | `GET /reporting/subscriber/getsubscribers/:accountId`; supports `groupId`, `page`, `pageSize` from 10 to 1000, and `usable` |
| Account information | `GET /account/info/{accountId}`; includes `authToken`, `ssoUrl`, and `provisionedCodes` |
| Incoming/delivery webhooks | `POST /account/webhooks/insertupdate/:accountId`; supports `MO` and `DR`, with an optional token |

These are documented capabilities, not successful tests against the user's SAM3 account. No authenticated provider API call was made, no message was sent, and account entitlement, sender configuration, schedule timezone, error behavior, and live SAM3 compatibility still need verification.

### What the documentation does not establish

- No native customer login, OAuth flow, refresh-token/session API, billing-plan/invoice/payment API, or Writer generation endpoint was found in the reviewed documentation navigation. These require separate approved contracts.
- Incoming-message results do not provide documented conversation IDs or read/unread state. The mobile backend needs an explicit threading, identity, and read-state design rather than assuming the demo's conversation model maps directly to those results.
- Subscriber fields such as `nextBillingDate` and `isPastDue` describe member/customer CRM records. They are not the merchant's SAM subscription or account billing data.
- Account information contains credentials and an SSO URL. The backend must return an allowlisted mobile-safe projection, never forward the full provider response or expose `authToken`/`ssoUrl` in the client, logs, or examples.
- The webhook token is documented as optional; no cryptographic signature scheme was established by this review. Verify how to authenticate and validate actual webhook requests.
- The SMS documentation states 160 characters for the US and 140 for Canada. The demo's 1,600-character editor and generic segment estimate are not proof that a production request supports that length. Confirm provider limits, concatenation, encoding, and recipient-country behavior before enabling delivery.

## Proposed architecture — not a deployed service

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

The owned backend is a proposed integration boundary, not a claim that SAM already exposes these mobile endpoints. It must be implemented and deployed before real account data, billing, AI generation, or sending can be enabled. Provider secrets belong on the backend; do not ship them in the mobile app. The current Writer is deterministic offline template assistance using only supplied details.

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

### Billing integration

The Billing tab currently uses demonstration information. Sample plan details, balances, usage, invoices, and payment-method references are not assertions about the user's SAM account. No charge, purchase, subscription modification, card update, or invoice payment is performed by the demo.

Obtain the current billing contract from the SAM team before connecting the view. Verify the authoritative provider, owner permissions, organization mapping, currency and amount units, usage period, invoice status, and allowed portal actions. No native billing endpoint or hosted payment flow has been assumed. A link to the full SAM website opens a separate web session; it does not synchronize account data into the app.

The directly reviewed API v1 documentation does not provide merchant plan, invoice, or payment endpoints. Subscriber-level `nextBillingDate` and `isPastDue` fields belong to CRM/member records and must not populate the owner's SAM Billing screen.

Start with authenticated read-only account and invoice data. Enforce billing permissions on the server and scope every record to the current business. If account management later uses a provider portal, generate it through the approved backend flow and reflect confirmed provider results. Keep card details and billing credentials outside the app's local demo storage. Review any purchase or upgrade flow against the [release requirements](RELEASE.md) before adding it.

## Delivery sequence

1. **Integration contract:** the SAM3 workflow walkthrough and direct API v1 documentation review are complete. Validate the documented campaign, subscriber, and incoming-message APIs against an authorized SAM3 test tenant; confirm sender provisioning and production limits. Obtain the separate native sign-in, merchant billing, and Writer contracts. The user enters credentials through the service's own login interface.
2. **Read-only staging:** implement sign-in, tenant authorization, inbox, contact/consent, campaign reporting, and owner-scoped billing adapters. Verify pagination, empty states, permission failures, expiry, and network recovery with synthetic data.
3. **Controlled sending:** add preview and explicit confirmation, server consent checks, idempotent jobs, webhook reconciliation and audit records. Test only with designated consenting test recipients.
4. **Pilot:** enable a small authorized group, monitoring, incident ownership and a server-side send kill switch. Verify account deletion, session revocation and tenant isolation.
5. **Store candidate:** complete [release requirements](RELEASE.md), signed native-device tests, review access and accurate privacy declarations. Keep demo and production data clearly separated.

Do not turn the connection status to “connected” or remove demo labels solely because a URL or token was entered. Require a successful authenticated health/account check and tested adapter behavior.
