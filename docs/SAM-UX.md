# SAM mobile experience

Version 0.3 is a mobile companion for the SAM 3.0 workspace at `sam3.txhd.io`, designed to look and behave like the product the owner already uses. It lets a business owner prepare campaigns, manage subscriber groups, and keep SAM's web tools one tap away. Everything the app saves lives on the device; it is not signed in to a SAM account and does not send messages, read the live inbox, or load billing.

## Design reference

The authenticated SAM 3.0 workspace and the public textmunication.com site were inspected on October 12, 2026. The app follows them directly:

| Element            | SAM 3.0 / textmunication.com                                                   | App                                                        |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Wordmarks          | SAM AI wordmark in the SAM header; Textmunication wordmark on the website      | SAM AI in the app header and sign-in; Textmunication on welcome |
| Primary color      | SAM blue `#1785CF` (Sign In, New Message, Add Subscriber)                      | `C.primary` for primary buttons, links, active tab         |
| Secondary actions  | Pink outline `#CF1785` (Manage, View campaigns, View Details)                  | `accent` button variant on dashboard tiles                 |
| Outline actions    | Blue outline (Send Campaign), gray outline (Create Group)                      | `outlinePrimary` and `outline` variants                    |
| Text and surfaces  | Ink `#020817`, slate `#64748B`, borders `#E2E8F0`, page `#F8FAFC`, white cards | Same tokens in `src/ui.tsx`                                |
| Typeface           | textmunication.com uses Inter; SAM uses Roboto                                 | Inter (400–700) loaded with `@expo-google-fonts/inter`      |
| Page header        | Large bold title, muted subtitle, action button on the right                   | `PageHeader` with the action row beneath on phones         |
| Statistic tiles    | Label, large value, caption, optional pink action                              | `StatCard`                                                 |
| Campaign wizard    | "Create New Campaign", Step n of 5, percent complete, progress bar, five steps  | Same structure and labels                                  |
| Sign in / register | "Welcome Back", "Create your SAM account!", required-field asterisks, Remember me, Forgot password?, Terms and Privacy footer | Same copy and layout |

SAM's left sidebar (Dashboard, Campaigns, Automated Messaging, Subscribers, Inbox, Gamification, Integrations, Reporting, Subaccounts) becomes a five-tab bar: Dashboard, Campaigns, Inbox, Subscribers, Account. Features that only exist on the web (automated messaging, keywords, reporting, numbers, billing) are reachable from Inbox and Account through verified links.

## Navigation and first use

- **Welcome:** Textmunication wordmark, the "Turn every text into revenue" headline, a SAM AI dashboard preview, **Create account** and **Sign in**.
- **Create account:** Account (email, password, confirm) then Business (name, industry). **Sign in:** email and password with Remember me and Forgot password (opens SAM). Both open a local session saved on the device. Credentials are never stored or transmitted.
- **Dashboard Overview:** greeting, **Send Campaign**, four tiles (Total Unique Subscribers → Manage, Total Campaigns → View campaigns, Monthly Opt-ins, Monthly Opt-outs), **Up next** (scheduled campaigns and drafts, past-due schedules flagged), **SAM AI Assist**, and **Open SAM on the web**.
- **Campaigns:** Drafts / Scheduled / Sent tiles, search, status chips, list rows with type and status badges. Drafts and schedules reopen in the wizard; sent campaigns open SAM on the web.
- **Inbox:** honest empty state with links to Inbox, Automated Messaging, and SAM Help AI on the web.
- **Subscribers:** **Create Group** and **Add Subscriber**, tiles, Groups list (All subscribers, Manual Groups, Opted Out Subscribers), search by name or number, subscriber detail sheet.
- **Account:** business information (editable), "Not connected to SAM" status, Plan & billing (public plans only, managed in SAM), links to SAM account settings, numbers and keywords, Inbox, SAM Help AI, API documentation, **Sign out**, **Remove data from this device**.
- Unknown routes redirect to the dashboard. A restored session keeps the route it was opened on; a fresh sign-in starts at the dashboard.

## Campaign flow

1. **Campaign Details:** name (required), type (SMS; MMS and RCS are shown as web-only), sender note.
2. **Message Content:** SAM AI Assist (Share an offer with the guided offer helper, Reconnect, Send an update, tone chips), **Use a past message** when sent campaigns exist, the message editor, the automatic opt-out line, and the GSM/Unicode segment estimate.
3. **Audience:** All subscribers or any group, with subscribed counts and opted-out exclusions. A campaign can be saved before any subscribers exist.
4. **Schedule:** Save as draft, Tomorrow at 10:00 AM, or a custom date and time in the device time zone. Past times are rejected. When editing, the current schedule can be kept.
5. **Review:** phone preview with the opt-out footer, recipients, SMS per person, estimated messages, summary, **Save Draft** / **Schedule Campaign**, and **Delete campaign** for saved campaigns.

Editing a saved campaign allows jumping between steps. Closing with unsaved changes asks to keep or discard. Scheduled campaigns are saved locally; a schedule whose time has passed is labeled **Past due** until rescheduled. Nothing sends until the app is connected to SAM.

### Offer guidance

The offer helper fills editable fields from a chosen example (20% off, $10 off, free add-on) with the business name prefilled, validates amounts and dates, and writes customer-facing wording with in-person or online redemption instructions. It does not create a coupon or discount anywhere.

## Campaign ideas and results

**Boost a slow day** on the Dashboard (and **Ideas** on Campaigns) opens a list of ideas filtered by the owner's industry, with generic ideas after them. A restaurant sees a slow-day breadsticks discount, a dinner push, a lunch-rush reminder, weekend plans, a win-back, and a today-only offer; retail, fitness, salon/spa, automotive, real estate, and non-profit businesses see their own.

Each idea shows the full message with the business name, an editable offer value, three "why this works" points, a suggested send time (today if the cutoff has not passed, otherwise tomorrow), and **What it could bring in**: subscribers to reach (prefilled with the current count, editable so a new owner can explore), redemption percentage, average sale, and cost per message (prefilled with the Run plan overage). The projection multiplies reach by the 98% SMS open rate from textmunication.com, applies the redemption rate, and shows estimated revenue, message cost, and net. It is labeled as an estimate from the owner's inputs. **Create this campaign** opens the wizard with the name, message, All subscribers, and the suggested time filled in; the projection is saved with the campaign and shown again on Review.

After sending through SAM, the owner opens the saved campaign and taps **Mark as sent in SAM**, which recounts recipients and records the time. Tapping a sent campaign opens its results sheet: message, audience, projected versus actual, a form for redemptions, revenue, and notes, the difference from the projection, **Use again**, and a link to delivery reports in SAM. The Campaigns "Sent" tile totals logged revenue. Nothing in this loop sends a message; it records what the owner did in SAM and what happened.

## Subscribers

Adding a subscriber requires a name, a mobile number (normalized to E.164; ten-digit North American numbers get +1), a group, and the owner's confirmation that the person agreed to receive texts. Duplicate numbers are rejected. Subscribers can change group, be marked opted out (recorded with a timestamp and excluded from every audience), be resubscribed, or be removed. Groups are unique ignoring case; "All subscribers" is reserved.

## Billing boundary

Plan & billing lists the public plans from textmunication.com/pricing (checked October 12, 2026) for reference and states that plans, credits, invoices, and payment are managed in SAM on the web. The app shows no balance, charges nothing, and offers no in-app purchase.

## Completed browser verification — October 12, 2026

Checked in Chrome inside the 390 × 844 phone frame (`/phone.html`) and at 1568 pixels wide, with no console errors:

- Welcome, Create account (Account → Business), and Sign in rendered with the Textmunication and SAM AI wordmarks, Inter, and SAM's layout.
- Account creation opened Dashboard Overview with the entered business name. Subscribers showed zero records and the default groups.
- Adding "Sarah Lee" with a ten-digit number and consent saved `+1 (925) 555-0182` in VIP; the VIP count and Total Unique Subscribers updated.
- The wizard saved "Weekend special" to VIP scheduled for tomorrow at 10:00 AM. Campaigns listed it with SMS and Scheduled badges; Dashboard's Up next and Monthly Opt-ins updated.
- Reloading the frame restored the session, the subscriber, and the schedule.
- Editing the campaign jumped straight to Review, showed **Schedule Campaign** with the kept schedule, and **Delete campaign** removed it after confirmation.
- SAM AI Assist produced a 20% offer message with the prefilled business name; closing the wizard showed the discard guard.
- Account showed business information, the not-connected status, links, and Plan & billing with the public plans. Sign out returned to welcome; signing in restored the saved subscriber.
- Campaign ideas opened from the Dashboard, showed the slow-day special with the business name, the projection updated with edited inputs, and **Create this campaign** opened the wizard with the message and suggested send time prefilled; Review showed the projected impact. **Mark as sent in SAM** moved the campaign to Sent, and the results sheet saved redemptions and revenue and showed projected versus actual.
- Unit tests: 79 passing, covering SMS segmentation, consent, scheduling, immutable updates, malformed and legacy persisted data, template suggestions, phone normalization, subscriber and group rules, campaign types, deletion, and custom date parsing. Lint, TypeScript, `expo install --check`, `expo-doctor` (18/18), and iOS/Android/web exports passed.

## Remaining acceptance checks

These are not implied by the browser results above:

- Signed iOS and Android builds on physical devices: keyboard avoidance inside sheets, large text, safe areas, back gestures, haptics, VoiceOver/TalkBack, and the branded splash screen.
- Behavior with hundreds of subscribers and campaigns (list performance).
- Everything that needs the live connection: sending, inbox sync, keyword opt-ins, reporting, and billing. See the [integration plan](INTEGRATION.md) and [release checklist](RELEASE.md).
