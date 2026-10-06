# Textmunication Mobile

A mobile companion for businesses using Textmunication, built with Expo 57, React Native, TypeScript, and Expo Router. One application targets iOS, Android, and a responsive browser preview.

**Status: working local demo, not a production-connected app or a published store release.** All contacts, conversations, and metrics are fictional. No live SMS requests are made. Account passwords, API keys, private customer data, and signing credentials are not included.

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

- Overview with sample delivery metrics, recent campaigns, and unread conversations.
- SMS campaign composer with templates, subscribed-audience counts, opt-out text, GSM/Unicode segment estimates, and a review step.
- Local campaign drafts and a tomorrow-at-10-AM schedule preview in the device's time zone. These schedules **do not execute**.
- Searchable inbox, read/unread tracking, locally saved replies, and opted-out recipient blocking.
- Searchable contact groups, subscription status, and contact details.
- Local persistence with schema validation, serialized saves, and a demo reset.
- Responsive navigation, screen-reader labels, native safe areas, app icons, EAS profiles, and a GitHub checks workflow.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npx expo install --check
npm run export
```

Tests cover SMS segmentation (including extended GSM characters and emoji), consent, scheduling, immutable updates, and malformed persisted data. `expo export` checks JavaScript bundling for iOS/Android/web; it does **not** produce signed IPA/AAB binaries or prove device behavior.

## Connect the real platform

The authenticated web workspace was reviewed read-only to confirm group/individual campaigns, scheduling, templates, subscribers, and inbox workflows. The inspected account reported that sending is not provisioned. Textmunication support must resolve that before live delivery can be tested.

The mobile app still needs the existing customer sign-in API and a tenant-scoped backend connection. Provider Basic-auth credentials belong on that backend, never in the app bundle or an `EXPO_PUBLIC_*` variable. No native sign-in endpoint has been assumed or fabricated.

See [integration plan and verified sources](docs/INTEGRATION.md), [store release checklist](docs/RELEASE.md), and [dependency security status](docs/SECURITY-STATUS.md). The dependency audit has unresolved upstream findings; security review is a production release gate.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Expo Router screens and shared provider layout |
| `src/workspace.tsx` | Shared native UI and demo interaction screens |
| `src/store.tsx` | Device-only demo persistence |
| `src/domain.ts` | Pure business rules and fictional seed data |
| `src/domain.test.ts` | Domain tests |
| `assets/` | Original app icon, vector source, and asset generator |
| `app.json`, `eas.json` | Native app identity and cloud build profiles |
| `.github/workflows/check.yml` | CI validation |

The proposed store identifiers are `com.textmunication.mobile`; verify ownership and availability before the first release. Link the project to the business's Expo account with `npx eas-cli@latest init` when ready. No Expo project ID, store account, or paid build has been created by this implementation.

The generated Expo template license is retained in `LICENSE`; final business licensing and approved production brand assets should be confirmed before distribution.
