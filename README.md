# SAM by Textmunication

A mobile companion for business owners using the current [SAM AI workspace](https://sam3.txhd.io/), built with Expo 57, React Native, TypeScript, and Expo Router. The 0.2 redesign centers the everyday work: prepare campaigns, handle the inbox, and check billing. Writing assistance stays inside the campaign workflow. One application targets iOS, Android, and a responsive browser preview.

**Status: working local demo, not a production-connected app or a published store release.** Contacts, conversations, activity, and billing information are fictional. Writer uses deterministic offline templates, not a live SAM AI service. No live SMS request or billing transaction is made. Account passwords, API keys, private customer data, and signing credentials are not included.

## Try it

Use Node.js 24 LTS (or a supported version at least 22.13), then:

```sh
npm ci
npm run web
```

For a phone or simulator:

```sh
npm start
```

The project includes `expo-dev-client`; the recommended device path is an EAS development build. See [release setup](docs/RELEASE.md) for signing, iOS device registration, and build profiles. For a compatible Expo Go version, use `npx expo start --go` and scan its QR code. Your phone and development computer must be able to reach each other. iOS local builds require macOS; EAS cloud builds can be started from Windows.

## Included

- Five primary destinations: Home, Campaigns, Inbox, Audience, and Billing; settings are available from the header.
- An owner-focused Home with quick actions for campaigns, inbox, and billing, followed by items needing attention and a short optional getting-started guide.
- Writing assistance inside campaign creation: offer, reconnection, and update starters plus tone choices. Suggestions use the details you supply and remain editable; the interface identifies this as offline template assistance.
- A three-step SMS composer: Message, Audience, and Review, with suggested campaign names, subscribed-audience counts, opt-out text, and GSM/Unicode segment estimates.
- **Use again:** reuse a past campaign from its details or choose **Use a past message** in a blank composer. The copy starts at Message with editable text and name, a reminder to check dates and offers, and a fresh audience review. It becomes a separate local draft only when saved; old schedules and results are not copied.
- Editable local drafts and schedule previews in the device's time zone. Draft edits preserve campaign identity; schedules **do not execute**.
- Searchable inbox, read/unread tracking, locally saved replies, and opted-out recipient blocking.
- Searchable contact groups, subscription status, and contact details.
- A Billing demo for exploring account information. Sample amounts and billing records are not the owner's actual plan, balance, payment method, or invoices; no charge, purchase, or plan change is performed. The account-settings link opens the verified SAM web page, not an assumed payment portal.
- Local persistence with schema validation, serialized saves, saved guide progress, and a demo reset.
- Responsive navigation, screen-reader labels, native safe areas, app icons, EAS profiles, and a GitHub checks workflow.
- A server-only API v1 read adapter and manually triggered GitHub connection check for account information, groups, campaigns, incoming messages, and subscribers. The mobile app remains disconnected from these services.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npx expo install --check
npm run export
```

Tests cover SMS segmentation (including extended GSM characters and emoji), consent, scheduling, immutable updates, malformed persisted data, faithful template suggestions, duplicate-footer prevention, draft identity, and guide-state validation. `expo export` checks JavaScript bundling for iOS/Android/web; it does **not** produce signed IPA/AAB binaries or prove device behavior. The [SAM UX walkthrough](docs/SAM-UX.md) records the intended interaction checks separately from completed automated tests.

## Connect the real platform

**Live read access is verified:** [GitHub run 37544172541](https://github.com/AsefiAb/TM-APP/actions/runs/37544172541), at commit `08b743b`, passed all six checks on October 6, 2026: account, groups, past campaigns, scheduled campaigns, today's first incoming-message page, and one group's first subscriber page. The adapter also passed 52 local tests, TypeScript checking, and lint. The account now lists a provisioned sender entry. No SMS was sent, and a listed entry does not establish outbound SMS permission or delivery. Sampled and empty responses do not establish populated pagination or complete inbox synchronization.

`SAM_ACCOUNT_ID` and `SAM_AUTHORIZATION` are configured as GitHub repository secrets and were not copied locally or embedded in the mobile app. To rerun the sanitized read-only check, use **Actions → Check SAM API connection → Run workflow** on **main**. The mobile app remains a demo: GitHub verification does not deploy a backend or connect phones. [Connect your SAM account](docs/CONNECT-SAM.md) gives the remaining steps: approved customer sign-in and merchant billing contracts, a backend hosting target, and an authorized sending test after sender capability is confirmed. No additional secrets are needed for the read checks.

The authenticated SAM AI workspace at `sam3.txhd.io` was inspected on October 6, 2026. It exposes a four-step Writer, campaigns with SMS/MMS/RCS choices, Help, Take Tour, and FastTrack. The initial campaign walkthrough displayed an account-not-provisioned message. The later API check now lists a sender; the campaign UI has not been rechecked. Sending configuration and delivery still require verification; no message was sent during inspection.

The complete official [API v1 documentation](https://txhd.io/api/v1/docs/) was directly reviewed in the browser on October 6, 2026. It documents Basic-auth APIs for campaign creation/modification/deletion, direct SMS, campaign reports, incoming messages, groups, subscribers, account information, and MO/DR webhook setup. The six live reads above passed; sending, mutations, webhook delivery, customer login, billing, and live Writer remain untested. The [integration plan](docs/INTEGRATION.md) maps the routes and remaining gaps, including the corrected HTTP-202 campaign-list and terminal-empty-inbox compatibility handling.

The mobile app still needs approved native sign-in and a tenant-scoped backend. The reviewed API does not establish native login/session refresh, merchant billing-plan/invoice/payment endpoints, or live Writer generation. Incoming messages do not supply documented conversation IDs or read/unread state. Subscriber CRM billing fields are not the business owner's SAM billing. Account responses can contain credentials, so the backend must return only allowlisted mobile-safe fields; provider secrets and SSO URLs must not be exposed in the app. Confirm production SMS limits before enabling delivery: the docs state 160 characters for the US and 140 for Canada, while this demo permits longer drafts with generic segment estimates.

See [integration plan and verified sources](docs/INTEGRATION.md), [store release checklist](docs/RELEASE.md), and [dependency security status](docs/SECURITY-STATUS.md). The dependency audit has unresolved upstream findings; security review is a production release gate.

## Project layout

| Path                                                          | Purpose                                                         |
| ------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/app/`                                                    | Expo Router screens and shared provider layout                  |
| `src/workspace.tsx`, `src/sam-workspace.tsx`                  | Route entry and owner workspace navigation                      |
| `src/screens.tsx`, `src/campaign-composer.tsx`, `src/ui.tsx`  | Core screens, guided campaign flow, and shared controls         |
| `src/store.tsx`                                               | Device-only demo persistence                                    |
| `src/domain.ts`                                               | Pure business rules and fictional seed data                     |
| `src/domain.test.ts`                                          | Domain tests                                                    |
| `src/sam.ts`, `src/sam.test.ts`                               | Offline Writer helpers, editable draft rules, and focused tests |
| `server/sam-client.ts`, `server/sam-client.test.ts`           | Server-only API v1 read adapter and simulated-response tests    |
| `server/config.ts`, `server/checks.ts`, `server/check-sam.ts` | Server configuration and read-only connection checks     |
| `.github/workflows/sam-api-check.yml` | Manual main-branch API check using repository secrets |
| `docs/CONNECT-SAM.md`                                         | Plain-English connection setup and developer handoff            |
| `docs/SAM-UX.md`                                              | Mobile interaction design and acceptance walkthrough            |
| `assets/`                                                     | Original app icon, vector source, and asset generator           |
| `app.json`, `eas.json`                                        | Native app identity and cloud build profiles                    |
| `.github/workflows/check.yml`                                 | CI validation                                                   |

The proposed store identifiers are `com.textmunication.mobile`; verify ownership and availability before the first release. Link the project to the business's Expo account with `npx eas-cli@latest init` when ready. No Expo project ID, store account, or paid build has been created by this implementation.

The generated Expo template license is retained in `LICENSE`; final business licensing and approved production brand assets should be confirmed before distribution.
