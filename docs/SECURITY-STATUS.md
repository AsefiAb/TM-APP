# Dependency security status

**Production release is blocked pending dependency security review.** The app is an unpublished prototype. This audit does not establish that every finding is exploitable in the shipped app, and it does not certify production security.

## Audit snapshot — October 6, 2026

A read-only `npm audit --json --package-lock-only` against the installed dependency lock reported **28 findings: 18 high, 10 moderate, 0 critical**. These represent four underlying advisories plus affected parent-package chains. Counts can change after dependency or advisory updates; rerun against the final release lockfile.

| Root dependency in the audited lock | Exposure assessment | Current decision |
| --- | --- | --- |
| `braces@3.0.3` | Nested-pattern denial of service, reached through `micromatch` and Metro tooling. Production app reachability was not established. | The advisory lists no patch, and the registry's latest version was 3.0.3. Keep build inputs/glob configuration trusted and development tooling off untrusted networks; track an upstream fix. [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| `node-forge@1.4.0` | RSA signature-verification flaw. Present through Expo CLI and code-signing tooling; certificate verification calls exist. A vulnerable end-user app path was not established. | The advisory lists no patch, and the registry's latest version was 1.4.0. Review signing/update workflows and certificate trust before release; do not accept untrusted signing inputs. [Advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| `decode-uri-component@0.2.2` | Malformed-input decoding denial of service, through `expo-router → query-string`. This is a runtime routing dependency; assess reachable URL/deep-link/query parsing. | Patched in 0.5.0, but a direct override is incompatible with the current consumer: `query-string@7.1.3` expects a callable CommonJS export, while 0.5.0 is ESM-only. Use a validated SDK-compatible fix or reviewed backport. [Advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [0.5.0 package metadata](https://github.com/SamVerschueren/decode-uri-component/blob/v0.5.0/package.json) |
| `uuid@7.0.3` | Buffer-boundary issue in `v3/v5/v6`. The installed `xcode@3.0.1` consumer uses `v4()` without a supplied buffer, which does not match the documented trigger. | No urgent override is justified solely by this usage. A scoped `xcode → uuid@11.1.1` override could remove the affected dependency, but requires native prebuild/signing tests before adoption. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [11.1.1 CommonJS exports](https://github.com/uuidjs/uuid/blob/v11.1.1/package.json) |

Registry inspection found `expo@57.0.27` and `expo-router@57.0.25` were the current `latest`/`sdk-57` releases. Router 58.0.16 was on `next`, alongside Expo 58. Upgrade the SDK as a coordinated, tested change when appropriate; do not independently replace Router with another SDK major. These registry tags are time-sensitive.

No dependency edits or overrides were applied by this audit. Do not run `npm audit fix --force`: the report proposed downgrades to Expo 44.0.6 and React Native 0.72.17, which would invalidate this project's SDK alignment. Audit severity and `fixAvailable` are inputs to review, not proof of compatibility.

## Before production

Re-audit the final lockfile, resolve compatible fixes, and document a security owner's review of each remaining finding, its actual reachability, mitigation and follow-up. Explicitly assess routing inputs and signing/update trust. Verify changes with dependency checks, tests, native builds and device tests. Until that review and the other [release requirements](RELEASE.md) are complete, do not treat the prototype as a production release candidate. A clean dependency audit would still not replace authentication, tenant-isolation or consent-enforcement testing.
