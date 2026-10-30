# RecallMD Research

A Next.js App Router application for MBBS / NEET-PG student research, with the original 28 questions across six sections, server-side draft recovery, editable review, atomic submission, privacy preferences, optional encrypted email opt-ins, consent-gated UTM attribution, and a protected researcher workspace.

MongoDB Atlas is the sole persistence database. Browser cookies hold secure credentials; survey answers, emails, acknowledgements, cookie choices, selection statuses, and permitted campaign records are stored in MongoDB. There are no simulated successful writes, sample dashboard values, public administrator registration, or third-party analytics pixels.

## Run locally

Use Node.js 22.9+ or 24 LTS. Dependencies and versions are recorded in `package-lock.json`.

```sh
npm ci
cp .env.example .env.local
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Configure `.env.local` with your Atlas URI, a generated authentication secret, and your administrator credentials. Never commit real environment files; they are ignored by Git. Do not overwrite an already configured `.env` with a blank example.

```dotenv
MONGODB_URI=mongodb+srv://<database-user>:<percent-encoded-password>@<atlas-host>/?retryWrites=true&w=majority
MONGODB_DB_NAME=neetpg_research
ADMIN_EMAIL=<your-email>
ADMIN_PASSWORD=<a-unique-password-at-least-16-characters>
AUTH_SECRET=<generated-secret-at-least-32-characters>
APP_URL=http://localhost:3000
RESPONSE_RETENTION_DAYS=365
```

```sh
npm run config:check
npm run db:check
npm run admin:create
npm run dev
```

Open [localhost:3000](http://localhost:3000). Administrator sign-in is available directly at `/admin/login`; it is intentionally absent from the public navigation. Provisioning never changes an existing account. Remove `ADMIN_PASSWORD` from the environment after initial provisioning. An existing administrator is authenticated against its stored scrypt hash, not the provisioning environment variable.

The setup scripts use `@next/env`, matching the application's environment-file precedence and `$` expansion. `config:check` reports only fixed setting names and validity, never credentials or arbitrary environment-file lines. Quote/escape special characters according to Next.js environment-file syntax; prefer base64url secrets. Existing process environment values take precedence over files. Restart the app after environment changes. `APP_URL` must match the exact browser origin, including protocol and port.

## Atlas setup: complete verification sequence

1. Create an Atlas account, project, and cluster in an appropriate region.
2. Under Database Access, create a dedicated database user with a strong unique password. Grant `readWrite` only on `neetpg_research` (or the configured database). Do not grant database administration privileges to the production app.
3. Under Network Access, allowlist your current development public IP as a single `/32`, preferably using an expiring entry. Database access is separate from Atlas website access. See [Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
4. Open **Connect → Drivers → Node.js** and copy the connection string.
5. Replace username/password/host placeholders. Percent-encode password delimiters such as `@`, `:`, `/`, `#`, and `%`. Keep TLS verification enabled. `MONGODB_DB_NAME` determines the database used by the app.
6. Put the finished URI in `.env.local`, or preserve an existing configured `.env`. Do not use a `NEXT_PUBLIC_` prefix for any secret.
7. Set the remaining values above. Use a 16+ character administrator password and a cryptographically generated AUTH_SECRET. Retention defaults to 365 days and must be an integer from 1 through 3650.
8. Install with `npm ci`.
9. Run `npm run config:check`, `npm run db:check`, then `npm run admin:create`. Administrator provisioning creates privileged access and should be performed only by the authorized operator.
10. Run `npm run dev`, then open the exact configured origin.
11. Confirm `db:check` reports a successful ping. The app initializes collections and indexes on its first database operation.
12. Open the survey and test a saved draft. Refresh in the same browser and confirm answers recover. Rejecting optional cookies must not block the survey. On a test campaign link, accept optional cookies and verify the consented attribution behavior.
13. Finish the questionnaire, review answers, separately choose whether to provide email, acknowledge Terms and Privacy, and submit. Save the private response reference and withdrawal key. Confirm the response, consent event, and optional encrypted contact persist in Atlas.
14. Sign in at `/admin/login`. Verify actual analytics, response details, filters and CSV. Verify opted-in contacts separately at `/admin/contacts`. Standard research CSV exports must not contain email addresses. Marking a contact selected does not send an email.
15. Run `npm run lint`, `npm run test`, and `npm run build`. All must exit 0. For an isolated real-database check, use `npm run test:integration` as described below.
16. Deploy to Vercel with separate development, preview, and production settings, then repeat connection, draft, consent, opt-in, submission, access-control, and deletion checks on the deployed origin.

## Data collections and retention

| Collection | Contents | Expiration |
| --- | --- | --- |
| `survey_responses` | Stable Q1–Q28/answer IDs, immutable question snapshot, analytics fields, policy acknowledgements/version, optional email opt-in flag, consented attribution snapshot, timestamps, unique submission token, receipt and hashed withdrawal credential. No email address. | Configured response retention, default 365 days. |
| `survey_drafts` | Answers, section, consent/acknowledgement flags, random locator and hashed secret. No email address. | 30 days from latest save. |
| `survey_draft_contacts` | Separately encrypted, explicitly opted-in draft email. | Same expiry as its draft; removed on opt-out or submission. |
| `early_access_contacts` | AES-256-GCM encrypted email, keyed email hash, private response link, opt-in timestamp, exact offer version/text, notice version, selection status. | Same expiry as its response; independently removable. |
| `privacy_preferences` | Random preference ID, hashed credential, accept/reject boolean, notice version and timestamps. | 180 days from latest choice. |
| `consent_events` | Dated cookie choices, submission acknowledgements and email-withdrawal events. Existing events are preserved until their expiry or full-response withdrawal. | Cookie events: 180 days. Submission/withdrawal events: response expiry. |
| `campaign_attribution` | First and latest permitted campaign labels, linked to a privacy preference. No full URL or referrer. | 30 days from the attribution window's start. |
| `admin_users` | Normalized email, salted scrypt hash (N=131072, r=8, p=1), active role and timestamps. | Managed by the operator. |
| `admin_sessions` | Hashed 256-bit opaque session token, administrator ID, absolute expiry. | 8 hours. |
| `rate_limits` | Hashed global/session/email buckets and atomic counters; no IP addresses. | 15–30 minutes. |

TTL indexes remove expired documents asynchronously. Reads independently enforce expiry, so an expired credential cannot recover a record while waiting for MongoDB cleanup. Indexes cover unique submission/reference/session locators, expiration, date sorting, preparation stage, survey version, contact status, and preference lookup. Index initialization is cached by schema version and database name and retried safely after failure.

Anonymous draft recovery requires both a random UUID locator and a separate 256-bit secret in an HttpOnly/SameSite=Strict cookie. Knowing a MongoDB `_id` or locator is insufficient. Cookies are `Secure` in production. Contact emails are stored separately but privately linkable to a response; the UI and policy therefore describe emailed participation as confidential and identifiable to authorized researchers, rather than anonymous.

MongoDB multi-document transactions make response insertion, optional contact insertion, consent-event creation, draft completion, and draft-contact deletion atomic. A failed write rolls back all of them. Unique submission-token indexes and retry handling return one original receipt and withdrawal key across retries. MongoDB Atlas supports the required replica-set transactions; an unsupported standalone local MongoDB server is not a substitute.

## Consent, cookies and attribution

The questionnaire wording/version is preserved. New submissions require an explicit Terms acceptance and Privacy acknowledgement. Email invitations and campaign tracking are separate opt-ins. Policy and offer versions are server-defined, rather than trusted from the survey payload. Legacy responses remain readable without fabricating historical acknowledgements.

A visible cookie banner offers equally prominent accept/reject controls and a preferences dialog. Preference values and dated events are saved to MongoDB, while the essential preference cookie only provides authorization. Rejected/unset preferences prevent attribution writes on the server. No UTM values are persisted before acceptance. If a visitor leaves the campaign URL before accepting, earlier tags are not recovered from hidden storage.

Only `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content` are accepted; each is limited to 100 characters and a restricted campaign-label alphabet. Obvious email addresses, markup, unknown fields, and oversized labels are rejected or omitted by the client. Campaign authors must never put personal information into links. Incoming labels are user-supplied recruitment metadata, not independently verified identity or traffic measurements.

First and latest touch timestamps are server-generated. Attribution is attached to a response only while the stored preference is active and accepted. Switching tracking off deletes the attribution record and unsets associated response attribution. Capture and revocation write the same preference record inside transactions, so concurrent revocation/capture cannot leave a newly accepted-looking tracking record after a successful rejection. The dashboard reports actual consented sources/campaigns and excludes uncollected visits from attribution.

Cookies: `recallmd_draft` (30 days), `recallmd_privacy` (180 days), and `recallmd_admin` (8 hours). No third-party tracking cookies or advertising scripts are used by the application. The host may maintain separate access logs; the deploying operator must configure/disclose those and supply study-owner/contact information required for recruitment.

## Early-access offer and contact controls

The published offer is a free RecallMD subscription for selected respondents who provide genuine, thoughtful, relevant answers, when the product becomes available. Email is completely optional and only authorizes contact about selection and the subscription. Selection also considers completeness, preparation-stage coverage, and capacity; honest criticism is welcome. Subscription duration and included features are specified in the invitation. There is no guaranteed selection, launch date, lifetime access, or automatic paid subscription. The exact offer version and wording are recorded with each opt-in.

Only active administrators can view decrypted email contacts at `/admin/contacts`, paginate/filter them, or mark them pending, selected, or not selected. The implementation does not send invitations or marketing emails; a reviewed mail delivery workflow would be a separate integration. Standard answer exports include only an opt-in boolean, never email ciphertext, email hashes, or decrypted addresses.

Email encryption derives a domain-separated AES key from AUTH_SECRET using HKDF. Every value has a fresh random IV and authenticated encryption tag. **Back up AUTH_SECRET securely. Before rotating it, re-encrypt both contact collections using the old and new key in a controlled maintenance procedure, and revoke administrator sessions. Destroying the old secret without migration makes old contacts unreadable.** Rotate before recruitment if the deployment secret was exposed. Do not silently change the secret on each startup.

## Data withdrawal and deletion

`/survey?withdraw=1` accepts the private receipt and withdrawal key. A participant can remove only the email while leaving research answers, or withdraw the full response, linked contact, draft and submission-consent events. No identity information is required. Deletion uses a transaction. The withdrawal credential is stored only as a hash. Keep private receipts out of public URLs, analytics, messages, and logs. Authorized browser draft recovery can restore the receipt/key while its credential and completed marker remain valid.

For operator-managed deletion:

```sh
npm run data:purge -- --receipt=<private-response-reference> --confirm-delete
npm run data:purge -- --confirm-delete
```

The first command removes the response and related research/contact records; the second sweeps only expired records across all expiring collections. Neither runs during unit tests. Apply participant withdrawal and retention to managed exports and provider backups as well. Live deletion does not recall downloaded files or instantly purge backups. A retention-setting change applies to new submissions; migrate existing `expiresAt` values explicitly when required by a policy change.

## Authentication and application security

Researcher sessions use iron-session authenticated encryption plus a live revocable MongoDB session. Every admin page and API checks a valid session and active admin role on the server; hiding the public navigation link is not an access-control boundary. Logout revokes the database token and clears the cookie. Disable an administrator by setting `active: false`; subsequent requests fail live authorization. There is no public signup or password-reset endpoint.

All mutations validate exact Origin against APP_URL, JSON content type, and request schema. SameSite cookies provide another CSRF boundary. Bodies are capped at 64 KiB even without Content-Length. Zod rejects malformed IDs, unknown questions/options/fields, overlong text, inconsistent Other values, duplicate choices, and more than three features. Draft emails can remain incomplete while typing but final opted-in emails must be valid. Queries use validated primitives and escaped literal regexes. Private responses use `Cache-Control: no-store`.

Public write/authentication/export limits use shared MongoDB counters across instances. Limits do not collect IPs or device fingerprints; deployment WAF/bot protection is still needed against distributed abuse and exhaustion of a global bucket. Logs contain fixed categories, numeric error codes and code locations, never raw driver messages, full URIs, passwords or email values. Security headers include frame denial, nosniff, referrer/permissions restrictions, CSP and production HSTS. CSP retains framework-required inline support; assess nonce-based tightening separately for the deployed framework and host.

## API reference

- `POST /api/survey/draft`: partial answers, `currentSection` 0–6, acknowledgement and optional email fields. Sets/reuses the essential credential.
- `GET /api/survey/draft/current` or `/[id]`: matching credential required; returns only that draft, including its opted-in email after decryption.
- `POST /api/survey/submit`: complete validated answers plus required `termsAccepted: true`, `privacyAcknowledged: true`; optional `emailOptIn` and `email`.
- `POST /api/survey/withdraw`: `{ receipt, key, action: "response" | "email" }`; action defaults to full response.
- `GET /api/privacy/preferences`: current authorized preference, or an undecided state.
- `POST /api/privacy/preferences`: `{ analytics, policyVersion: "2026-10-30", campaign?: { source, medium, campaign, term, content } }`; campaign requires acceptance.
- `POST /api/privacy/attribution`: campaign labels; server requires current accepted preference.
- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/session`: protected session lifecycle.
- `GET /api/admin/analytics`, `/api/admin/responses`, `/api/admin/responses/[id]`, `/api/admin/export`: authenticated research reporting.
- `GET /api/admin/contacts`: authenticated opted-in email list, page/limit/status filters.
- `PATCH /api/admin/contacts/[id]`: authenticated same-origin selection-status update; no email is sent.

List/export parameters are page (1+), limit (1–100; default 20), stage (Q5 answer ID), version, from/to (`YYYY-MM-DD`, inclusive IST days), and literal search in receipt/written feedback. Exports use the current page and filters, with `X-Total-Count`, `X-Total-Pages`, and `X-Export-Page` headers. CSV escapes quotes/newlines and neutralizes spreadsheet formulas, including after leading whitespace. For large studies, export from a controlled snapshot to avoid concurrent pagination changes.

Errors use `{ error: { code, message, fields? } }` and safe 400/401/403/404/409/413/415/422/429/503 statuses. Unexpected errors return a generic 500. Configuration and database failures never report a successful save.

## Analytics interpretation

All charts use MongoDB aggregation on retained submissions for the current questionnaire version. There are no sample counts. Completion snapshot is retained submitted responses divided by (retained submitted responses + unexpired unfinished drafts), with submitted markers excluded even if a previous follow-up failed. With no denominator it is `—`; it is not a cohort conversion rate because expiration windows differ. Multi-select charts use counts. Timeline dates and filters use Asia/Kolkata; CSV timestamps use UTC. Email opt-in count is a separate retained-contact count across questionnaire versions.

Historic question and answer labels come from immutable snapshots. If the questionnaire changes, increment its version; never repurpose old IDs. Policy changes use POLICY_VERSION independently. Export columns currently follow the supplied 28-question bank; design version-specific exports before introducing/removing question IDs.

## Tests and live verification

```sh
npm run config:check
npm run lint
npm run test
npm run build
npm run test:integration
```

Lint, tests and build must exit 0. Unit tests never connect to or delete production data. They cover the question contract, feature cap, unknown IDs, input limits, request protection, CSV injection, filters/pagination, auth, draft expiry, idempotency, empty analytics, policy acknowledgements, email opt-in/encryption/tampering, campaign filtering, consent gating, expiry and revocation.

The optional integration suite uses a new `recallmd_test_<random>` Atlas database, a temporary localhost server on port 3101, and a disposable fake administrator/contact. It verifies real draft recovery, atomic submission, duplicate safety, authorization, email encryption/decryption, consent records, campaign aggregation/revocation, contact review, CSV exclusion, email-only withdrawal and complete deletion. It intentionally forces one database write to fail and verifies transaction rollback leaves no partial response/contact. It then drops **only its randomly generated disposable test database**, guarded against the configured app database. Production data is not modified by the suite.

A production database user should only have access to the application database. For live tests use a separate test Atlas user/cluster via optional `MONGODB_TEST_URI` with permission to create/drop the disposable database. Do not broaden a production account just to run tests. `INTEGRATION_PORT` can choose a free port.

## Deployment and remaining operator responsibilities

Deploy as a Next.js Node.js application on Vercel with `npm run build`. Set MONGODB_URI, MONGODB_DB_NAME, stable AUTH_SECRET, exact HTTPS APP_URL and optional retention separately for development/preview/production. Provision the intended administrator from a trusted terminal; do not retain ADMIN_PASSWORD in deployed runtime settings. Use separate databases, users and secrets per environment. A preview needs its exact origin configured; do not disable Origin checks to support arbitrary preview URLs.

Run `NODE_ENV=production npm run config:check` with the intended deployment settings before release. It checks HTTPS and required application settings without printing their values.

Atlas must allow the deployment environment's outbound network addresses. Use stable egress, private networking, or a host with controlled outbound addresses. Vercel documents options under [Secure Compute](https://vercel.com/docs/networking/secure-compute). Permanently allowing all IPs (`0.0.0.0/0`) is not the default production recommendation. Hosting/Atlas plan changes may be needed for suitable networking.

Before recruitment, the responsible operator must complete any required institutional/ethics review, confirm the free subscription offer, approve the Terms/Privacy wording for the intended audience/jurisdiction, configure host logs/backups/export retention, set abuse controls, and verify HTTPS and networking. The notices describe implemented behavior; they are not an assessment or claim of legal/regulatory compliance. The consent implementation follows explicit, separate choices; see [ICO consent-management guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-we-manage-consent-in-practice) as a reference rather than a declaration of jurisdiction-specific compliance.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Awaiting configuration / 503 | Run config:check; correct missing/invalid fixed settings, then restart. Ensure AUTH_SECRET has at least 32 characters after Next.js environment expansion and production APP_URL uses HTTPS. |
| Database unavailable | Run db:check; confirm cluster status, DNS, database-user permissions, escaped URI, and laptop/host egress allowlist. |
| Preference or submission 500 after backend development changes | Restart the development server to clear stale module exports. Check safe numeric error categories in server logs. Do not disable transactions, consent validation or authentication. |
| Atlas authentication failure | Use database-user credentials, not the Atlas website login; percent-encode URI password delimiters; grant readWrite only on the intended DB. |
| Invalid Origin / 403 | Match APP_URL to the browser's exact protocol, hostname and port. localhost and 127.0.0.1 are different origins. |
| Email cannot decrypt after secret rotation | Restore the correct old secret securely and perform a reviewed contact-key migration; do not delete contact records as a repair. |
| Missing draft | Same browser/host, valid cookie, within 30 days, not private-mode cookie clearing. IDs alone cannot authorize recovery. |
| Early-access email missing | Explicit opt-in and a valid email are required; drafts store it separately; expired/withdrawn contacts are excluded. |
| No attribution | Optional cookies must have been accepted on a URL containing permitted campaign labels; direct/rejected visits intentionally have no attribution. |
| Admin login fails | Correct database, provisioned normalized email, active admin role and matching stored password hash. Provisioning never overwrites an existing account. |
| TTL record still visible | MongoDB cleans asynchronously; app reads enforce expiry immediately. Use the controlled expired-record sweep if necessary. |
| Rate limited | Wait for the 15-minute bucket and retry; tune deployment abuse controls for recruitment scale. |
| Port busy | Stop the matching workspace's stale server, or use another port and update APP_URL accordingly. |
