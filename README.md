# RecallMD Research

A complete Next.js App Router application for anonymous MBBS / NEET-PG student research. It includes the supplied 28-question survey, six sections, editable review, anonymous server-side draft recovery, idempotent submission, self-service withdrawal, researcher authentication, real MongoDB analytics, response management, and paginated CSV export.

The interface uses self-hosted Inter, Tailwind CSS, shadcn-style Radix UI primitives, Lucide icons, React Hook Form, Zod, and Recharts. MongoDB Atlas is the sole persistent database. There are no sample analytics, fake writes, browser storage databases, external analytics scripts, or public administrator registration.

## Quick start

Use Node.js 22 or 24 LTS and npm. Commit `package-lock.json` and use `npm ci` for reproducible installations.

```sh
npm ci
cp .env.example .env.local
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Paste the generated random secret into `AUTH_SECRET` in `.env.local`. Generate a unique administrator password with your password manager (at least 16 characters); set the remaining values below. The example deliberately contains no usable credentials or secret.

```dotenv
MONGODB_URI=mongodb+srv://<database-user>:<percent-encoded-password>@<cluster-host>/?retryWrites=true&w=majority
MONGODB_DB_NAME=neetpg_research
ADMIN_EMAIL=<your-researcher-email>
ADMIN_PASSWORD=<unique-password-at-least-16-characters>
AUTH_SECRET=<generated-random-secret>
APP_URL=http://localhost:3000
RESPONSE_RETENTION_DAYS=365
```

```sh
npm run db:check
npm run admin:create
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and [researcher sign in](http://localhost:3000/admin/login). After provisioning, remove `ADMIN_PASSWORD` from the environment file; ordinary login uses the database hash. The setup command never overwrites an existing administrator, and never runs on application startup. Provisioning credentials are not required in Vercel's runtime environment.

An unconfigured installation renders the public interface and returns clear HTTP 503 errors for persistence operations. It never reports that data was saved when a database write did not succeed. Until a save succeeds, answers exist only in the open React form and will be lost on refresh. Configure Atlas before collecting responses.

## MongoDB Atlas setup, end to end

1. Create a MongoDB Atlas account and a project, then create a cluster in the desired region. Wait for it to finish provisioning.
2. In **Database Access**, create a dedicated database user with a strong unique password. Assign `readWrite` on **only** `neetpg_research` (or your configured database), rather than project-wide administrative access. The application creates its collections and indexes on the first database operation.
3. In **Network Access**, allowlist your current public development IP as a single `/32` address. Prefer an expiring entry for development. Atlas database access is separate from your Atlas website login. See [Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
4. Use **Connect → Drivers → Node.js** to copy the cluster's connection URI.
5. Replace username, password, and database placeholders. Percent-encode password characters such as `@`, `:`, `/`, `#`, and `%`. Keep `mongodb+srv://`, the Atlas hostname, and the recommended TLS settings. Do not put a literal `<password>` placeholder into a real URI. `MONGODB_DB_NAME` determines which database the app uses even if a different database appears in the URI path.
6. Create `.env.local` using the commands above, and add the completed URI as `MONGODB_URI`. `.env`, `.env.local`, and other real environment files are Git-ignored. Never prefix secrets with `NEXT_PUBLIC_`.
7. Set `MONGODB_DB_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, generated `AUTH_SECRET`, and exact `APP_URL`. All requests must use that origin; `localhost` and `127.0.0.1` are different origins. The optional retention value defaults to 365 days.
8. Run `npm ci` to install the lockfile's compatible dependencies.
9. Run `npm run admin:create`. Expect `Administrator created`. An existing email prints that no credentials were changed. Remove the provisioning password from `.env.local` afterward.
10. Run `npm run dev`. Open `http://localhost:3000` using that exact hostname.
11. Run `npm run db:check`. Expect `MongoDB connection verified`. This only pings the selected database; the app initializes its indexes when the survey or admin APIs are used.
12. Open `/survey`, select answers in each section, review them, and submit. Save the private withdrawal details. The optional participation checkbox may remain unchecked. The server requires its explicit boolean value, so an omitted consent field is malformed, while `false` is valid.
13. In Atlas **Browse Collections**, open `neetpg_research.survey_responses`. Confirm there is one document with server timestamps, stable question and option IDs, the question snapshot, and `status: submitted`. Refresh the app to verify the same survey cannot insert a second response. An active draft should recover from the same browser before submission.
14. Sign in at `/admin/login`. Verify `/admin/dashboard` contains the actual submission and charts; `/admin/responses` supports stage/date/version/search filters, details, and CSV download. No individual answers are public. Test withdrawal using `/survey?withdraw=1` and the saved reference/key.
15. Run `npm run lint`, `npm run test`, and `npm run build`. All must exit 0. `npm start` serves the optimized build (stop the dev server first).
16. Deploy to Vercel as described below. Configure development, preview, and production environments separately and repeat the submission/login/persistence checks against the deployed origin.

## Deploy to Vercel

Import this project as a Next.js application. Use the Node.js runtime, build command `npm run build`, and the lockfile. Configure `MONGODB_URI`, `MONGODB_DB_NAME`, `AUTH_SECRET`, `APP_URL=https://your-exact-domain.example`, and optionally `RESPONSE_RETENTION_DAYS`. Do not deploy `ADMIN_PASSWORD`; provision the administrator from a trusted local environment pointing to the intended production database first. Use distinct secrets, databases, and researcher accounts for preview and production. Configure a fixed preview domain for strict Origin checking or set `APP_URL` for each preview deployment and redeploy.

Atlas must allow the **outbound addresses of your deployment environment**, not merely your laptop IP. Use stable egress IPs supported by your hosting plan, a private network connection where supported, or a deployment environment with controlled egress. Vercel documents private and stable egress options under [Secure Compute](https://vercel.com/docs/networking/secure-compute). Do not permanently allow all IP addresses (`0.0.0.0/0`) as the default production setup. An Atlas tier or hosting plan without suitable network features may need a plan or architecture change.

Use HTTPS for all production traffic. Production configuration rejects non-HTTPS `APP_URL`; session and anonymous cookies receive `Secure`. Keep TLS validation enabled in the MongoDB driver. Configure platform request-body and traffic limits, regional placement, backup policy, log retention, alerts, and secrets rotation. Review CSP for your deployment: inline script/style support remains enabled because this Next.js application uses framework bootstrap scripts and Recharts inline styles. No arbitrary third-party script origins are allowed. For a stricter deployment policy, add request-specific nonces and validate against your host before tightening it.

Before recruiting students, the responsible researcher must complete any required institutional/ethics review, supply study-owner/contact information as needed by the institution, review the displayed privacy notice and retention period, and ensure the hosting provider's access logs match the study's policy. This implementation does not claim clinical validation, improved examination results, or assessed regulatory compliance.

## Data and persistence

- `survey_responses`: stable `q1`–`q28` IDs and immutable `qN_aN` option values, full question/answer snapshot and per-question version, survey version, derived analytics fields, timestamps, expiry, optional confirmation, unique submission token, response reference, and hashed withdrawal credential.
- `survey_drafts`: random UUID session locator **plus a separate 256-bit secret**, with only its SHA-256 hash in MongoDB. The browser holds both in a host-only HttpOnly/SameSite=Strict cookie. Knowing a database ID or draft locator alone does not authorize access. Recover via `/api/survey/draft/current` on the same browser; no secret appears in URLs or JavaScript.
- `admin_users`: normalized email, scrypt password hash with a random salt, admin role, active flag, and timestamps. No public registration. Re-running provisioning preserves an existing user's credentials.
- `admin_sessions`: hashed opaque 256-bit credentials, administrator ID, 8-hour absolute expiry, and TTL. The cookie uses `iron-session` authenticated encryption with `AUTH_SECRET`. Every request checks the live database session and the active admin role. Logout deletes the session and cookie. Authentication does not rely on client-only redirects or a middleware matcher.
- `rate_limits`: shared fixed-window atomic counters. Subjects are anonymous draft IDs, normalized administrator email hashes, or global endpoint buckets; no client IP address or device fingerprint is collected. Counters expire within 15–30 minutes. These limits work across multiple server instances. Add deployment WAF/bot controls for recruitment at scale; application-wide limits intentionally favor privacy and can be exhausted by abuse.

Drafts expire 30 days after the most recent save. Submitted responses expire after `RESPONSE_RETENTION_DAYS` (365 by default). Sessions expire after 8 hours. TTL cleanup is asynchronous; all reads independently exclude expired documents. Submitted draft answers are cleared, and the short-lived draft remains as a completed marker for browser duplicate protection. Unique `submissionToken` indexes prevent concurrent/retried insertion even if a network response is lost. A separate duplicate response check makes retries return the original receipt and same withdrawal key.

Indexes cover submission token/reference uniqueness, date sorting, preparation stage and version filters, anonymous draft lookup, administrator email, session hash, and expiry. Connections are reused across requests/hot reloads, with 5-second selection/connect and 10-second socket timeouts. Index initialization is cached and safely retried. No raw driver errors or URI values are returned or logged.

Survey versions are intentionally separated in overview analytics. The response list and export can filter historical versions, and the detail view uses each document's stored question snapshot. When changing the survey, increment `SURVEY_VERSION` and question versions, retain original answer IDs for unchanged meanings, and introduce new IDs for changed meanings. Never repurpose an existing answer ID. Export columns follow the current 28-question bank, with historic option labels resolved from each stored snapshot; plan a version-specific export migration if future versions introduce different question IDs.

The completion snapshot is **retained submitted responses / (retained submitted responses + unexpired unfinished drafts)** for the current version. Submitted drafts are excluded, including when a follow-up draft update failed after the response insert. It is undefined (`—`) with no records. It is not a cohort conversion rate because retention windows differ. Multi-select percentages would not sum to 100%; charts use counts instead. Dates and date filters use Asia/Kolkata; CSV timestamps are UTC.

## API contracts

All mutations require an exact matching `Origin` and JSON content type. The request body is capped at 64 KiB, including streamed bodies without a Content-Length header. Zod rejects unknown questions/fields, invalid options, duplicates, oversized strings, inconsistent Other fields, mutually exclusive answers, and more than three Q21 features. Written answers allow up to 4,000 characters; Other text allows 500.

```json
{
  "surveyVersion": "1.0.0",
  "responses": {
    "q1": { "values": ["q1_a1"] },
    "q8": { "values": ["q8_a1", "q8_a2"] },
    "q9": { "text": "Optional feedback" }
  },
  "consent": false
}
```

The abbreviated body above is valid for a draft with `currentSection: 0`; submission requires all closed questions. Anonymous credentials are established by saving a draft first.

| Endpoint | Access and behavior |
| --- | --- |
| `POST /api/survey/draft` | Anonymous; accepts partial responses plus `currentSection` 0–6; sets/uses credential cookie; 180 saves/session/15 min and 2,000 global/15 min. |
| `GET /api/survey/draft/[id]` | Matching secret cookie required; `current` resolves the cookie's draft; rejects expired records. |
| `POST /api/survey/submit` | Complete validated responses; requires draft cookie; unique idempotency token; 10/session and 1,000 global/15 min. |
| `POST /api/survey/withdraw` | `{ receipt, key }`; deletes matching response and draft; 100 global/15 min. |
| `POST /api/admin/login` | Email/password; generic failure; 10 attempts/email and 200 global/15 min; encrypted cookie. |
| `POST /api/admin/logout` | Active admin; same-origin check; revokes session. |
| `GET /api/admin/session` | Active admin; returns only ID, email and role. |
| `GET /api/admin/analytics` | Active admin; aggregates only, current survey version. |
| `GET /api/admin/responses` | Active admin; paginated, safe summary projection. |
| `GET /api/admin/responses/[id]` | Active admin; full questions/answers, never withdrawal/session secrets. |
| `GET /api/admin/export` | Active admin; paginated CSV; 30 exports/admin/15 min. |

List/export parameters: `page` (1+), `limit` (1–100, default 20), `stage` (stable Q5 answer ID), `version`, `from` / `to` (`YYYY-MM-DD`, inclusive IST days), and `search` (literal text in response reference or written feedback). The UI exports **the current page**, and you can move through pages for further downloads. Export response headers include `X-Total-Count`, `X-Total-Pages`, and `X-Export-Page`. Large studies should export from a controlled snapshot to avoid pagination changes during concurrent submissions. CSV cells quote/escape commas, quotes, and newlines, and neutralize leading formula characters (including after whitespace). No personal identifiers are requested by the survey.

Errors use `{ "error": { "code": "…", "message": "…", "fields": [] } }`, with field details for validation errors only. Statuses include 400 malformed JSON, 401 unauthorized, 403 origin mismatch, 404 absent/expired record, 409 already submitted/version conflict, 413 oversized body, 415 wrong media type, 422 validation, 429 rate limit, and 503 configuration/connectivity failures. Responses containing research data use `Cache-Control: no-store`.

## Retention and deletion

Participants save a private text receipt containing a random reference and withdrawal key. `/survey?withdraw=1` deletes a matching response without collecting identity information. Only the hash of the withdrawal key is stored. Do not put these keys in emails, analytics, or public URLs. A lost key cannot be recovered by name because identity is not collected.

Administrative deletion and a manual TTL sweep are available from a trusted terminal:

```sh
# Permanently delete a participant's response and draft by private response reference.
npm run data:purge -- --receipt=<response-reference> --confirm-delete
# Remove expired responses, drafts, sessions and rate-limit counters.
npm run data:purge -- --confirm-delete
```

These commands target the explicitly configured database and never run during tests. The operator must also delete the relevant rows from managed CSV exports, apply expiry to backups, and keep exports encrypted with limited access. TTL does not remove downloaded files or external backups. Updating the retention environment value affects newly submitted responses; explicitly migrate existing `expiresAt` values if policy changes.

To revoke an administrator, set `active: false` in `admin_users`; live checks reject subsequent requests. To rotate a password, use a reviewed administrative script that hashes a new password and revokes that user's sessions, or revoke the account and provision a new email. There is no insecure password-reset endpoint. Rotating `AUTH_SECRET` invalidates all encrypted cookies; remove old `admin_sessions` as part of rotation.

## Verification

```sh
npm run lint
npm run test
npm run build
```

Expected: ESLint exits 0 with no warnings; Vitest reports all cases passing; Next.js builds successfully and lists App Router routes. Unit tests mock MongoDB, cookies and Next.js navigation as appropriate and do not connect to, clear, or delete any production database. They cover the survey contract, field limits, missing versus optional confirmation, single/multi-select answers, unknown IDs, feature cap, CSV injection/escaping, historic answer labels, filtering/pagination, request limits/origin validation, safe database errors, password hashing, session creation/revocation, unauthorized access, anonymous draft expiry/recovery, duplicate submissions, and empty analytics.

A passing mock-based suite does not establish Atlas connectivity, deployment networking, or live database durability. Complete steps 11–14 above against your configured Atlas cluster before collecting research data. Perform mobile, keyboard, and screen-reader checks, and run your institution's security review before launch.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `NOT_CONFIGURED` / 503 | `MONGODB_URI` scheme, `AUTH_SECRET` length, exact `APP_URL`, optional retention integer (1–3650). Restart Next.js after changing env files. Production requires HTTPS. |
| Atlas authentication failed | Database user's credentials (not Atlas website login), percent-encoding, and `readWrite` on the selected database. Use a fresh Drivers URI. |
| Server selection timeout / database unavailable | Cluster is running; current client or host egress IP is allowlisted; DNS supports SRV; firewall permits Atlas traffic. Run `npm run db:check`. |
| Malformed URI | No placeholder brackets, unescaped password delimiters, whitespace, or duplicated scheme; use the exact Atlas cluster hostname. |
| Login fails | Provisioning ran against the same database; email normalized to lowercase; account is active with role `admin`; password matches its stored hash. Provisioning never overwrites an account. |
| Origin rejected | Browser origin equals `APP_URL` exactly, including protocol and port. Configure previews separately; do not disable the origin check. |
| Draft missing | Same browser and host, cookies enabled, draft not expired, not cleared by private browsing. Draft IDs alone are intentionally insufficient. |
| Analytics empty | Submit a complete response; drafts are excluded. Check active survey version and expiry. No example records are generated. |
| TTL record still visible in Atlas | MongoDB's monitor runs asynchronously; application reads already enforce expiry. Use the manual purge if needed. |
| Rate limited | Wait for the 15-minute window, then retry. Tune documented limits for planned recruitment; add WAF controls for abuse. |
| Local server cannot start | Ensure port 3000 is free; if you choose another port, update `APP_URL` to match. |

## Structure

`app/` contains public pages, protected server layouts/pages, and API Route Handlers. `components/` contains reusable public, questionnaire, researcher and UI components. `lib/` contains database connections, schema, validation, security, services, filters, exports and analytics. `models/` defines document contracts. `scripts/` provides one-time provisioning, connection checks, and controlled deletion. `tests/` uses Vitest with no live database dependency. Rename the wordmark in `components/brand.tsx` and related metadata/copy to change branding.

## Optional live integration check

With Atlas configured, `npm run test:integration` starts an isolated Next.js development server on port 3101 and exercises real draft persistence/recovery, submission, idempotency, protected pages and APIs, administrator login/logout, analytics, response listing/detail, CSV, and withdrawal. It creates a uniquely named `recallmd_test_<random>` database and removes **only that disposable database** at the end, guarded by an exact name pattern and a check against your configured application database. It does not write to your application database. Use a separate test Atlas user/URI in optional `MONGODB_TEST_URI` if your production user correctly has only single-database access. The test account must be able to create and drop that disposable database. Do not broaden a production account just to run integration tests. `INTEGRATION_PORT` can select a free port.

The operational scripts support both `.env` and `.env.local` (`.env.local` takes precedence; existing process variables take precedence over files). Node.js 22.9+ is required for the optional environment-file loading flags. No credentials are printed by these scripts.
