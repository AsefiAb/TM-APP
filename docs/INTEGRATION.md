# Textmunication integration plan

Status: **prototype; not connected to production Textmunication accounts; not published to either store.** Research checked October 6, 2026. The app's demonstration data and local actions are not evidence of real message delivery, account access, or campaign execution.

## Verified public capabilities

Textmunication advertises a shared SMS/MMS inbox, individual and group messages, scheduled campaigns, contacts, opt-in collection, and reporting. These support a mobile companion for existing business users. SAM AI, RCS, and WhatsApp are advertised separately; their availability in a particular account and API must be verified before adding them to the app. Sources: [Solutions](https://www.textmunication.com/solutions), [SAM AI](https://www.textmunication.com/sam-ai), [Textmunication](https://www.textmunication.com/).

The [developer page](https://www.textmunication.com/developers) advertises REST APIs and incoming-message/delivery webhooks. Search-indexed official [API documentation](https://txhd.io/api/v1/docs/) describes Basic authorization and these examples:

| Capability | Published provider route |
| --- | --- |
| Send SMS | `POST /api/v1/text/send` |
| List campaigns | `GET /api/v1/campaign/list?filter=PAST` or `SCHEDULED` |
| Campaign delivery report | `GET /api/v1/campaign/getCampaignReport/{campaignId}` |
| Incoming messages | `GET /api/v1/reporting/mo/:accountId/{timeRange}` |
| Sent count | `GET /api/v1/reporting/sent/count/:accountId/:timeRange` |
| Subscribers by group | `GET /api/v1/reporting/subscriber/getsubscribers/:accountId` |
| Opt-outs | `GET /api/v1/reporting/getOptouts/:accountId` |

Direct access to the documentation returned HTTP 403 during research; search indexing exposed the above details. No authenticated provider requests were tested. Reconfirm request/response shapes, pagination, token construction, schedule timezone, limits, errors, and account entitlements with current documentation and a test account. Published provider credentials do not establish an end-user mobile sign-in protocol. [Privacy policy](https://www.textmunication.com/privacy-policy) also describes account API tokens and keys.

Existing public entry points: [US/Canada](https://txhd.io/), [International](https://intl.txhd.io/), and [SAM registration](https://sam3.txhd.io/register). Inspect the user's actual account to determine the platform/version and approved authentication flow. A website session must not be treated as a native-app session.

## Authenticated walkthrough observations

The user-authorized account walkthrough confirmed navigation for group, individual and rotational messaging, message history and scheduled messages, subscriber groups, and an inbox. The campaign interface exposes SMS segment choices, templates, group targeting and an opt-out footer. These observations establish visible product workflows; they do not verify API equivalence or successful sending.

**Provisioning dependency:** the inspected campaign screen reported that the account was not provisioned to send and required support assistance. Resolve account provisioning with Textmunication support before any end-to-end sending test. Do not present a local demo action or draft save as proof that this account can send.

This repository records only generic workflow observations. Private account identifiers, contact names, customer messages and account metrics must remain outside the source and documentation.

## Proposed architecture — not a deployed service

```text
iOS / Android app
    │ HTTPS + short-lived user session
    ▼
Textmunication-owned mobile backend
    ├── identity, organization membership and role checks
    ├── consent, recipient validation and send approval
    ├── idempotent jobs, audit events and webhook processing
    └── server-held provider credentials → Textmunication API
```

The owned backend is a proposed integration boundary, not a claim that Textmunication already exposes these mobile endpoints. It must be implemented and deployed before real account data or sending can be enabled. Do not call the provider directly with a privileged Basic token from the mobile app.

### Authentication and organization isolation

- Agree on an existing identity-provider integration or approved first-party login with the Textmunication team. If OAuth/OIDC is available, use authorization code with PKCE and verified redirect URIs. Do not invent or scrape a private login endpoint.
- Keep API secrets in server secret storage. Expo public environment variables, JavaScript bundles, source control, screenshots, and logs must never contain provider tokens or credentials.
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

Minimize retained customer data, redact message bodies and tokens from operational logs, define retention/deletion/export behavior, and record access/send audit events. Send push notifications only to authorized account devices; default to minimal lock-screen content. Push delivery requires separately configured native credentials and real-device testing.

## Delivery sequence

1. **Account walkthrough:** inspect real navigation and roles, identify the correct platform, obtain approved documentation and a test tenant, and confirm mobile sign-in. The user enters credentials through the service's own login interface.
2. **Read-only staging:** implement sign-in, tenant authorization, inbox, contact/consent and campaign reporting adapters. Verify pagination, empty states, permission failures, expiry, and network recovery with synthetic data.
3. **Controlled sending:** add preview and explicit confirmation, server consent checks, idempotent jobs, webhook reconciliation and audit records. Test only with designated consenting test recipients.
4. **Pilot:** enable a small authorized group, monitoring, incident ownership and a server-side send kill switch. Verify account deletion, session revocation and tenant isolation.
5. **Store candidate:** complete [release requirements](RELEASE.md), signed native-device tests, review access and accurate privacy declarations. Keep demo and production data clearly separated.

Do not turn the connection status to “connected” or remove demo labels solely because a URL or token was entered. Require a successful authenticated health/account check and tested adapter behavior.
