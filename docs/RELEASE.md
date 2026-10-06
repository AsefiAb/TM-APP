# iOS and Google Play release checklist

Status: **not published, not submitted, and not connected to production Textmunication.** This repository is an app prototype. EAS configuration and a successful JavaScript/web build do not prove native compatibility or store approval. Requirements below were checked October 6, 2026; verify them again when submitting.

## Before a release build

- Complete the production integration and safeguards in [INTEGRATION.md](INTEGRATION.md). Keep sample mode visibly identified; use TestFlight/internal testing for the prototype.
- Complete the dependency security review in [SECURITY-STATUS.md](SECURITY-STATUS.md). The October 6 audit reported 28 findings (18 high, 10 moderate), including tooling and routing dependencies. Re-audit the final lockfile, apply compatible fixes, and document reviewed exposure/mitigations for unresolved advisories before production. Do not blindly force upgrades or overrides.
- Use business-controlled Apple Developer, App Store Connect, Google Play Console and Expo/EAS accounts. Complete each account's identity/organization verification and agreements. Assign team access without sharing the owner's password.
- Confirm the final display name, Expo owner/project, `ios.bundleIdentifier`, and `android.package`. Any identifiers already in this repo are proposed until the business registers them. Create matching store records, choose version/build numbering, and record the App Store Connect app ID (`ascAppId`). Package names cannot be reused for a different app. [Play setup](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
- Configure iOS distribution signing/provisioning, Android upload signing and Play App Signing. Store signing keys and submission credentials in EAS/approved secret storage, never Git. EAS can manage signing after authorized account setup. [Expo build guide](https://docs.expo.dev/deploy/build-project/)

## Platform and policy checks

| Area | Required remaining work |
| --- | --- |
| Apple build toolchain | Verify the actual EAS image uses Xcode 26 or later and iOS 26 SDK or later; Apple has required these since April 28, 2026. Uploaded apps must target iOS 13 or later since September 9, 2026. [Apple requirements](https://developer.apple.com/news/upcoming-requirements/) |
| Android compatibility | Verify the generated store artifact targets Android 16/API 36 or later for a new mobile app, required since August 31, 2026. Check native dependencies and the final bundle for 16 KB page-size support. [Target API policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en), [16 KB guidance](https://developer.android.com/guide/practices/page-sizes) |
| Useful native app | Finish real account workflows before public submission. Apple expects a complete, useful app beyond a repackaged website. Give reviewers working access and a reachable backend. [Review guidelines, 2.1 and 4.2](https://developer.apple.com/app-store/review/guidelines/) |
| Existing paid customers | Proposed launch scope is a free companion for existing business accounts. Keep purchasing and upgrade calls to action out of the first version; verify the actual business model against Apple 3.1.3(f) and Google's payments policy before introducing billing. Approval is not guaranteed by calling it a companion. [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en) |
| Privacy | Publish an app-specific privacy policy, accessible in-app and in both listings. Inventory actual backend and SDK collection, including contact details, messages, identifiers, diagnostics and push tokens. Complete Apple App Privacy and Google Data safety accurately; demo behavior does not describe the eventual connected app. [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) |
| Deletion | If account creation is supported, including a linked signup flow, implement account deletion initiation in-app. Google also requires a working external deletion-request page. Document any retained data. Clearing demo data is not account deletion. [Apple deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion), [Google deletion policy](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en) |
| Permissions | Inspect generated Android manifest and iOS purpose strings. Request only permissions used by implemented features; this cloud messaging companion does not need access to the user's device SMS inbox. Test denial and revocation. [Expo permissions](https://docs.expo.dev/guides/permissions/) |

## Native acceptance tests still required

Run these against signed release candidates on physical iPhone and Android devices, including a small screen, a current OS, and the minimum supported OS. Test iPad too if tablet support is enabled. Record build ID, device/OS, result and defects.

- Cold start, navigation/back gestures, safe areas, keyboard avoidance, large text, VoiceOver/TalkBack and touch targets.
- Real sign-in, session refresh/expiry, background/foreground, logout, reinstall and cross-account cache isolation.
- Slow/offline connections, interrupted requests, retries, empty/error states, expired permissions and service outages.
- End-to-end test-recipient replies and campaigns: confirmation, duplicate tap, timeout, opt-out between scheduling and sending, timezone/DST boundaries, provider failure and delivery reconciliation.
- Any enabled media or push functionality on-device, with permission denial and disabled notification settings. Test notification routing after logout and account switch.
- Privacy/support links, account deletion where applicable, and no production credentials or real customer data in screenshots/logs.

Web testing and Expo Go are useful development checks but do not replace this native matrix. Resolve failures before widening distribution.

## EAS build and test distribution

These commands are instructions, not a record of commands already completed. Run from the repository root with Node/npm and the authorized Expo account. Configure matching build profiles in `eas.json` and the production backend environment first; inspect generated configuration changes before committing. [EAS setup](https://docs.expo.dev/build/setup/)

```powershell
npm ci
npx expo-doctor
npx tsc --noEmit
npx expo install --check
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```

If the project is already linked to the correct EAS organization/project, skip `init`. Review the configured `production` profile; it must generate a store-signed `.ipa` and an Android `.aab`, not an internal-distribution APK.

```powershell
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest build --platform android --profile production
```

After build validation, upload the specific tested artifacts. Add the correct `ascAppId` and Android submission credentials; set the Android submission track to `internal` and release status to `draft` until the release owner is ready to distribute it. Select the intended build when prompted instead of assuming the newest build is the tested one.

```powershell
npx eas-cli@latest submit --platform ios --profile production
npx eas-cli@latest submit --platform android --profile production
```

iOS upload reaches App Store Connect/TestFlight after processing; App Review and public release are separate actions. EAS Submit works from Windows; local iOS simulation/build tooling requires macOS. [iOS submission](https://docs.expo.dev/submit/ios/)

The current Expo Android guide supports the first upload through EAS after a Play app record and service-account credentials exist; manual Play Console upload is also available. Complete setup and testing before promotion. [Android submission](https://docs.expo.dev/submit/android/)

For personal Play developer accounts created after November 13, 2023, the current production-access requirement includes at least 12 testers opted into a closed test continuously for 14 days, then an application for production access. Check which account type the business owns. [Google testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)

## Store listing and final release

- Supply app title, description, category, support contact/URL, privacy URL, age/content ratings, countries and accurate app-access instructions. Complete Google app-content declarations, including advertising and data deletion, and Apple's export-compliance questions.
- Replace provisional artwork if needed. Capture actual app screens at the device sizes each console requests, using fictional customer data. Add the Play feature graphic and required icons; ensure screenshots describe implemented capabilities only.
- Give reviewers a dedicated test account and clear steps for the business workflows, with a controlled recipient/test environment. Explain account eligibility and billing model in review notes. Keep backend and support available throughout review. [Apple review preparation](https://developer.apple.com/app-store/review/), [Play app setup](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
- Complete TestFlight and Play testing, fix reported issues, and preserve test evidence. The release owner chooses the submitted build, rollout scope and release timing in the store consoles. Confirm the published listing and installed production behavior after approval.

No signing credentials, developer-account enrollment, store fees, native build success, review approval or publication are included by merely adding this source repository to GitHub.
