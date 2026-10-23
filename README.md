# SAM AI by Textmunication

A mobile companion for business owners using the [SAM 3.0 workspace](https://sam3.txhd.io/), built with Expo SDK 58 (React Native 0.88), TypeScript, and Expo Router. One codebase targets iOS, Android, and a responsive browser preview.

Version 0.3 matches the look of the live SAM 3.0 application and textmunication.com: the SAM AI wordmark, SAM blue controls, pink outline actions, slate text on white cards, the Inter typeface, and the same page structure (Dashboard Overview, Campaigns, Inbox, Subscribers, Account Settings) with SAM's five-step campaign wizard.

**Status: a working local workspace, not yet connected to a live SAM account.** Create account and Sign in open a workspace saved on the device. Subscribers, groups, and campaign drafts or schedules persist across restarts. No SMS is sent, no account is authenticated against SAM, and no billing transaction is made. Entered credentials stay in component memory and are discarded; do not use a real password for testing.

## Try it

Use Node.js 24 LTS (or a supported version at least 22.13), then:

```sh
npm ci
npm run web
```

Open `/phone.html` on the web server for the 390 × 844 phone frame titled **Mobile testing campaigns**. Native iOS and Android builds do not include the frame.

For a phone or simulator:

```sh
npm start
```

The project includes `expo-dev-client`; the recommended device path is an EAS development build. See [release setup](docs/RELEASE.md) for signing, iOS device registration, and build profiles. For a compatible Expo Go version, use `npx expo start --go` and scan its QR code.

## What the app does

- **Welcome:** the Textmunication wordmark, the "Turn every text into revenue" headline from textmunication.com, a SAM AI dashboard preview, and **Create account** / **Sign in**.
- **Create account and Sign in:** laid out like the SAM 3.0 register and sign-in pages (email, password with show/hide, confirm password, Remember me, Forgot password, Terms and Privacy links). Signup adds a Business step (name and industry). Forgot password opens the SAM website. This is a local session only.
- **Dashboard Overview:** "Welcome back" greeting, **Send Campaign**, and SAM's four tiles (Total Unique Subscribers, Total Campaigns, Monthly Opt-ins, Monthly Opt-outs) with pink **Manage** / **View campaigns** actions, an **Up next** list of scheduled campaigns and drafts, SAM AI Assist, and a link to SAM on the web.
- **Campaigns:** SAM's title and subtitle, Drafts / Scheduled / Sent tiles, search, status filter chips, and a list with type and status badges. Tapping a draft or schedule reopens it in the wizard; sent campaigns open SAM on the web.
- **Create New Campaign:** SAM's five steps with the same progress bar: Campaign Details (name, SMS type, sender note), Message Content (SAM AI Assist examples and tone, opt-out footer, GSM/Unicode segment estimate), Audience (All subscribers or any group, with live counts and opted-out exclusions), Schedule (draft, tomorrow at 10 AM, or a custom date and time), and Review (phone preview, recipients, estimated messages, delete). Scheduled campaigns are saved on the device; they do not send.
- **Campaign ideas ("Boost a slow day"):** ready-made ideas for the owner's industry, such as a slow-day breadsticks discount, a lunch-rush reminder, a dinner push, a flash sale, open class spots, or last-minute salon openings. Each idea shows why it works, a suggested send time, and a projection built from the owner's own numbers: subscribers reached at the 98% SMS open rate from textmunication.com, expected redemptions, average sale, message cost, and net. The idea opens the wizard with the message, audience, and send time filled in, and the projection is saved with the campaign.
- **Results:** after sending through SAM, the owner marks the campaign as sent and logs real redemptions and revenue. The campaign shows projected versus actual, the Campaigns tile totals logged revenue, and **Use again** starts a fresh copy. This is how the app shows that a given campaign was worth sending.
- **Inbox:** SAM's title and subtitle with an honest empty state and links to Inbox, Automated Messaging, and SAM Help AI on the web. Conversations require the live connection.
- **Subscribers:** SAM's title, **Create Group** and **Add Subscriber** actions, statistic tiles, the Groups list (All subscribers, Manual Groups, Opted Out), search by name or number, subscriber detail with group change, opt-out/resubscribe, and removal. Adding a subscriber requires a consent confirmation; numbers are normalized to E.164 and duplicates are rejected.
- **Account Settings:** business information (editable), a clear "Not connected to SAM" status, Plan & billing (the public plan list from textmunication.com/pricing with no in-app purchase), links to SAM account settings, numbers and keywords, Inbox, SAM Help AI, and the API documentation, plus Sign out and Remove data from this device.
- Responsive layout, screen-reader labels, native safe areas, app icons, EAS profiles, and a GitHub checks workflow.
- A server-only API v1 read adapter and a manually triggered GitHub connection check for account information, groups, campaigns, incoming messages, and subscribers. The mobile app does not import it.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npx expo install --check
npm run export
```

`npm test` uses glob patterns and needs Node 22 or newer. Tests cover SMS segmentation (including extended GSM characters and emoji), consent, scheduling, immutable updates, malformed persisted data (including legacy data without groups), faithful template suggestions, duplicate-footer prevention, draft identity, phone normalization, subscriber and group management, campaign types, deletion, campaign ideas and impact arithmetic, custom date parsing, and sent/results tracking. `expo export` checks JavaScript bundling for iOS, Android, and web; it does not produce signed binaries or prove device behavior. The [SAM UX walkthrough](docs/SAM-UX.md) records the browser checks and the design reference.

## Connect the real platform

**Live read access is verified:** [GitHub run 37544172541](https://github.com/AsefiAb/TM-APP/actions/runs/37544172541), at commit `08b743b`, passed all six checks on October 6, 2026: account, groups, past campaigns, scheduled campaigns, today's first incoming-message page, and one group's first subscriber page. No SMS was sent, and a listed sender entry does not establish outbound SMS permission or delivery.

`SAM_ACCOUNT_ID` and `SAM_AUTHORIZATION` are configured as GitHub repository secrets and were not copied locally or embedded in the mobile app. To rerun the sanitized read-only check, use **Actions → Check SAM API connection → Run workflow** on **main**. [Connect your SAM account](docs/CONNECT-SAM.md) lists the remaining steps: approved customer sign-in and merchant billing contracts, a backend hosting target, and an authorized sending test after sender capability is confirmed.

The authenticated SAM 3.0 workspace at `sam3.txhd.io` was inspected again on October 12, 2026 to align this app's screens: Dashboard Overview, Campaigns, the five-step Create New Campaign dialog, Inbox, Subscribers → Groups, and Account Settings. No campaign, message, subscriber, or setting was created or changed during the inspection.

The complete official [API v1 documentation](https://txhd.io/api/v1/docs/) documents Basic-auth APIs for campaign creation/modification/deletion, direct SMS, campaign reports, incoming messages, groups, subscribers, account information, and MO/DR webhook setup. Sending, mutations, webhook delivery, customer login, billing, and live Writer remain untested. The [integration plan](docs/INTEGRATION.md) maps the routes and remaining gaps.

See [integration plan and verified sources](docs/INTEGRATION.md), [store release checklist](docs/RELEASE.md), and [dependency security status](docs/SECURITY-STATUS.md). The dependency audit has unresolved upstream findings; security review is a production release gate.

## Project layout

| Path                                                   | Purpose                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `src/app/`                                             | Expo Router screens, font loading, and the shared provider layout |
| `src/welcome.tsx`, `src/auth-walkthrough.tsx`          | Welcome, Create account, Sign in, and password-reset handoff      |
| `src/access.tsx`                                       | Local session and business profile saved on the device           |
| `src/workspace.tsx`, `src/customer-workspace.tsx`      | Route entry, tab shell, Dashboard, Campaigns, Inbox, Account      |
| `src/subscribers.tsx`                                  | Subscribers, groups, add/edit/remove sheets                       |
| `src/campaign-composer.tsx`, `src/offer-builder.tsx`   | Five-step campaign wizard and SAM AI Assist offer helper          |
| `src/ui.tsx`, `src/brand.tsx`, `src/brand-assets.ts`   | Design tokens, shared controls, and logos                         |
| `src/store.tsx`                                        | Device persistence for the workspace                              |
| `src/domain.ts`, `src/sam.ts`, `src/offers.ts`         | Pure business rules, message helpers, and offer wording           |
| `src/*.test.ts`                                        | Domain, subscriber, offer, and helper tests                       |
| `src/ideas.ts`, `src/ideas-sheet.tsx`                  | Campaign ideas, impact projection, and the ideas browser          |
| `src/campaign-results.tsx`, `src/schedule.ts`          | Projected-versus-actual results sheet and scheduling helpers      |
| `src/plans.ts`, `src/links.ts`                         | Public plan list and verified SAM / Textmunication links          |
| `server/`                                              | Server-only SAM API v1 read adapter and connection checker        |
| `public/phone.html`                                    | Phone-framed browser preview                                      |
| `assets/`                                              | Icons, splash, and brand sources                                  |
| `docs/`                                                | UX walkthrough, integration, connection, release, and security    |
