# Founder backend deployment

## Status and scope

The Supabase backend is implemented on `feature/openai-agent-engine`. The UI, navigation,
and SQLite development demo are preserved. Founder controls are added to the existing Admin
page. Vercel gets one serverless function; server helpers live under `server/` so they cannot
be deployed as unauthenticated standalone API functions.

No customer wallets, payment integrations or paid traffic execution exist. Approval never
enables spending. The database has a check constraint forbidding `real_spending_enabled=true`.
An eventual live provider integration requires a separate reviewed implementation and a new
explicit approval for a particular campaign revision and budget.

## One-time setup

1. Create a **dedicated** Supabase project named `naughty-pilot`. Do not apply these migrations
   to Lotus or any other product. Confirm the plan and cost in Supabase before creating it.
2. Apply `supabase/migrations/20261010074906_founder_backend.sql` with the SQL editor or the
   Supabase CLI connected to that dedicated project. All tables have RLS enabled and no
   browser role grants; only the server service role may read/write them.
3. Disable public signups in Supabase Auth. Create the single founder in Supabase Auth using
   a user-entered password or invitation. Never put passwords in Git or chat. Copy the UUID.
4. Bind that UUID using the SQL editor (replace the placeholder):

   ```sql
   insert into public.np_founder(user_id) values ('FOUNDER_AUTH_UUID');
   ```

   The singleton constraint permits only one binding. Server configuration must match it.

5. Set Vercel server environment variables from `.env.example`: `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NP_ADMIN_USER_ID`, and `NP_BASE_URL`.
   Set `NP_OPENAI_API_KEY` to a key the founder enters securely. AI stays unavailable without
   it. Never use `VITE_` prefixes for those credentials.
6. For conversion callbacks, set a random `NP_CONVERSION_WEBHOOK_SECRET` of at least 32 bytes
   and configure your own trusted server to sign callbacks. No third-party conversion provider
   is automatically configured. Manual conversion reports remain unverified.
7. Deploy the branch to a Vercel preview, set `NP_BASE_URL` to that preview's exact HTTPS origin,
   and verify `/api/health`, founder login, persistence, tracked redirects, agent generation,
   approvals, and pause. Promote only after these checks with real credentials pass.

Initial planning is paused. Use **Founder controls** in the dashboard, then **Resume planning**.
Emergency pause revokes every campaign approval and discards pending agent output. Resuming
planning does not restore approval. Approve each campaign's current revision and explicit budget
again. Agents only return proposals, have no network tools, and are limited to 20 runs per rolling
24-hour window. OpenAI inference itself incurs the account's API usage costs.

## Conversion evidence

Manual `/api/cockpit/conversions` records are `founder_reported` and unverified, even when a
link is supplied. Signed `/api/conversions/webhook` callbacks can count verified campaign
conversions when a valid tracking link/session is found. Sign the exact raw JSON body:

```text
x-np-timestamp: Unix seconds
x-np-signature: hex(HMAC-SHA256(secret, timestamp + '.' + raw_body))
```

Requests older than five minutes are rejected. `external_id` is required and unique, preventing
duplicate credit. Callback signatures prove the configured server sent the event; they do not
independently prove a customer payment settled. DNT tracking redirects do not collect sessions.
First/last-touch analytics use recorded session history. Analytics load up to the latest 10,000
events and conversions and show a limitation notice at that boundary; underlying data is retained.

## Local verification

```text
npm ci
npm run typecheck
npm run build
npm test
npm run test:e2e
npm run test:e2e:founder
```

Founder tests run the migration in embedded PostgreSQL (PGlite), exercise SQL constraints and
RPCs, and drive the actual Express router over HTTP. Supabase Auth and OpenAI are fixture adapters
in those tests. These tests are not proof of live Supabase Auth, OpenAI generation or Vercel deployment.
PGlite serializes the parallel cap test; production uses explicit PostgreSQL row locks for
multi-worker concurrency. Audit writes fail closed rather than hiding database errors.

For the real Supabase backend locally, populate ignored `.env.local` and set `NP_BACKEND=supabase`.
Without that flag `npm run dev` runs the existing isolated SQLite demo. Its users and database
are not automatically migrated. Never deploy the local SQLite demo to Vercel.

Provider OAuth, website event collection and peer swaps remain unavailable in founder mode.
Tracked links, signed conversion callbacks, content, templates, schedules and manually reported
platform totals persist. Unavailable routes return explicit JSON errors rather than fake success.

## Verification on 2026-10-10

- Typecheck and production Vite build passed; npm audit reported zero vulnerabilities.
- 23 Node tests passed, including the founder PostgreSQL and HTTP contract tests.
- Two existing cockpit browser tests passed (desktop and mobile).
- Two founder controls browser tests passed (desktop and mobile), using clearly labeled fixtures.
- The local Postman collection passed five requests and ten assertions through Newman.
- Vercel's remote build and preview deployment succeeded. Preview `/api/health` and
  `/api/cockpit/auth/me` return JSON 503 `BACKEND_NOT_CONFIGURED` until environment setup.
- Local `vercel build` failed on Windows with `spawn cmd.exe ENOENT`; the remote Linux
  Vercel build succeeded. This is not evidence of a backend source build failure.

The dedicated Supabase project has **not** been provisioned. The connector's required
`get_cost` tool is unavailable and the dashboard requires interactive sign-in. No migration,
founder account or OpenAI key is configured in production. Existing production is not promoted
from this unconfigured preview. Live Supabase persistence, Supabase Auth, OpenAI generation,
and production acceptance remain pending; local fixture tests do not substitute for them.
