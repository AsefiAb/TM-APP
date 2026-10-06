# SAM mobile experience

The 0.2 design is a mobile companion for the current SAM AI workspace at `sam3.txhd.io`. Its purpose is to let a business owner finish common work quickly: prepare a campaign, handle inbox replies, and check billing. These tasks lead the experience; writing assistance is available within campaign creation.

The authenticated web workspace informed the workflows. The app uses fictional data, local drafts, sample billing information, and offline template suggestions. It is not signed in to the user's SAM account and does not call a live AI, sending, or billing service.

## Navigation and first use

- **Home:** direct quick actions for campaigns, inbox, and billing, then unread conversations and work to resume. The optional getting-started guide supports the tasks without becoming the main screen; progress survives a restart and can be revisited.
- **Campaigns:** find a draft, continue editing it, or start a new campaign. Editing updates the same record.
- **Inbox:** find a conversation, read the thread, and save a demo reply. Replies to opted-out contacts remain blocked.
- **Audience:** search contacts and inspect group membership and consent status.
- **Billing:** the fifth primary destination, with clearly labeled sample account information. It helps the owner understand the billing layout without implying that the app has loaded an actual balance, invoice, or payment method.
- **Settings:** available from the header so the five primary destinations remain easy to scan.

**Start with an example** sits above the message field, where assistance is useful. It offers three goals: Share an offer, Reconnect, and Send an update. Offer examples open a guided form for the business, benefit, qualifying purchase, exact expiration date, and optional terms. In-person use is the default; online checkout setup is optional. Reconnection and update messages retain the freeform details and tone controls. The owner explicitly applies or replaces a suggestion and can edit every word. Offline templates add framing; example discounts and dates appear only after choosing an example. The owner can type directly without using the helper.

## Campaign flow

1. **Message:** type directly, use Writer, or expand **Use a past message** to choose from recent sent campaigns. **Use again** in a sent campaign's details opens the same flow. Copied messages start here so the owner can update dates, prices, and offers. Preserve the message when moving between steps.
2. **Audience:** select a group and see how many subscribed contacts qualify. Opted-out contacts are excluded.
3. **Review:** show the complete message, opt-out wording, audience count, timing, and estimated SMS segments before saving a local draft or schedule preview.

The opt-out footer appears once. Segment estimates include that footer and account for Unicode characters. Saving a revised draft or schedule retains its ID and recalculates the audience using current consent. Sent sample campaigns cannot be rewritten. Local schedules do not execute.

Reusing a campaign carries only its message, audience choice, and editable name with a **(copy)** suffix. The new draft receives its own identity on save; original delivery results, schedules, and recipient totals are not carried forward. Current consent determines the new recipient count. Closing a reused message before saving invokes the existing unsaved-changes guard. This shortcut adds no navigation destination or live sending operation.

### Offer guidance

The owner selects an example such as 20% off a visit, edits the details, and reviews the generated customer message including the opt-out footer. Invalid amounts or dates and incomplete checkout setup produce clear guidance. The example fields stay in memory while the helper is collapsed or the goal changes; the saved campaign retains only the resulting message, audience, name, and any local timing preview. Offer-form changes participate in the unsaved-changes guard.

In-person guidance tells staff to verify eligibility and apply the discount in their register. The optional online path requires a checkout code and HTTPS link that the owner says they already created and tested; it does not create or verify those external settings. The one-use-code walkthrough explains how a future connected redemption service would respond to a first use and a repeat check. Its fictional code and local state are clearly labeled as an example, not a working coupon or fraud prevention. Real redemption remains separate [integration work](INTEGRATION.md#offers-and-redemption).

## Billing boundary

Billing in this build is a demonstration of the owner's account view. Sample amounts, billing records, and statuses must be labeled as examples, not presented as the inspected account's real financial state. Interactions must not imply that a card was charged, a plan changed, or a payment succeeded. **Open SAM account settings** opens the verified `/account-settings` page in the full SAM website; it does not establish billing access in the app. The inspected web account did not expose a billing ledger, payment controls, or plan prices.

Actual plan, balance, usage, invoice, and payment-method data require the approved SAM billing API or provider portal, authenticated owner permissions, and server-side tenant checks. Neither those native interfaces nor a payment flow has been verified. Live billing is separate integration work, alongside native sign-in and sending.

## Completed browser verification

The final web preview was exercised on October 6, 2026 using browser viewports of 390 × 844 and 320 × 740. These are browser checks, not physical-device or signed-native-build tests.

Final desktop visual verification also passed at 1280 × 800, with the sidebar retaining its 250-pixel width after the scroll-layout fix.

- Home displayed all five navigation tabs with the owner-focused layout.
- A campaign was created from offline Writer details, targeted to VIP, reviewed, and named **Saturday hours**. Closing the edited composer opened the unsaved-changes guard; **Keep editing** retained the fields.
- Saving the draft added one campaign. Reopening it, editing its content, and saving again retained a single matching campaign row and the VIP recipient count of 3.
- An unfinished reply to fictional contact Olivia remained after closing and reopening the conversation and after the preview was restarted. Saving the demo reply appended the message and cleared its draft.
- Fictional opted-out contact Daniel's conversation blocked reply controls.
- Audience search for Olivia returned one result; the view remained usable at 320 pixels wide.
- Billing opened with explicit not-connected status and sample credits. Its example-invoice sheet was clearly labeled and fit the 320-pixel viewport.
- Dismissing the Home guide and reloading kept it hidden. **Settings → Show getting-started guide** returned to Home and restored the guide with its saved 3-of-3 completion state.

TypeScript, lint, and all 23 automated tests passed. JavaScript export succeeded for iOS, Android, and web. Export verifies bundling; it does not produce signed store binaries or establish native behavior.

### Campaign reuse verification

The **Use again** improvement was checked on October 6, 2026 at 390 × 844, 320 × 740, and 1280 × 800 browser sizes. Both entry points opened the existing Message → Audience → Review flow. Choosing a past message filled its text and audience; an edited copy saved as a new draft with its own name, no schedule, and one opt-out footer. Reloading preserved that draft alongside the unchanged sent original. Closing either a picker-created copy or a directly reused message showed the unsaved-changes guard; **Keep editing** retained the message. The picker remained collapsed in a fresh blank composer.

All 13 campaign-helper tests passed, including four new reuse regressions for independent identity, source preservation, discarded scheduling/results, current consent counts, and Unicode-safe names. TypeScript, lint, and iOS/Android/web bundle exports passed. No browser errors were reported during this walkthrough. Native-device testing remains pending.

## Offer-helper verification

The offer helper was exercised on October 6, 2026 in 390 × 844 and 320 × 740 phone previews and at 1280 × 800 on desktop. A selected 20% example populated editable fields; an empty business name produced inline guidance. Switching between offer and update goals retained the offer fields. Closing unfinished offer work triggered the unsaved-changes guard, and returning retained it. Tapping the already-selected discount type preserved its entered value.

The optional online path withheld generated wording until its existing-code setup was acknowledged. Editing the discount removed that acknowledgement and preview. The in-person example populated the campaign editor, retained one opt-out footer in Review, and saved as **VIP thank-you offer — example**; the new draft survived refresh. The fictional redemption walkthrough displayed Valid, Used, then Already used. Its demo labeling remained visible at small phone width. No live code, checkout discount, SMS, or redemption was created.

All 33 mobile helper tests, TypeScript, lint, and iOS/Android/web bundle exports passed. The tested browser reported no errors. Native keyboard settings for checkout code/URL capitalization and autocorrection are configured but still require real-device checks.

## Remaining acceptance checks

These checks remain pending and are not implied by the browser results above:

- Complete a new campaign by typing directly without Writer, including navigation back through every step while retaining message, audience, and timing.
- Verify inbox search and read/unread counts through their complete interaction sequence, including switching between multiple unfinished conversation drafts.
- Verify both the Home billing shortcut and Billing navigation route, plus the external account-settings handoff.
- Test keyboard avoidance, large text, safe areas, native back gestures, and VoiceOver/TalkBack on signed iOS and Android builds. No signed-native or physical-device testing has been completed.

Automated helper tests cover faithful suggestions, footer duplication, final-body segment counts, title length, immutable draft edits, current consent counts, sent-campaign protection, reply draft handling, and valid saved guide state. Production authentication, live sending, inbox sync, billing, Writer behavior, notifications, and store submission require the separate [integration](INTEGRATION.md) and [release](RELEASE.md) work.
