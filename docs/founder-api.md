# Founder API contract

Vercel serves `/api/cockpit/*` from a single Express function backed by Supabase.
All responses are JSON (including errors); unknown API routes return 404, never the SPA.
Existing UI routes and CSS remain intact. SQLite remains available for local development only.

Authentication uses Supabase Auth and Secure, HttpOnly, SameSite=Strict cookies. Public
registration is disabled. Exactly one founder UUID is bound in `np_founder` and must match
`NP_ADMIN_USER_ID`. Email and user-editable metadata never grant admin rights.

| Route                                       | Contract                                                                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| GET /api/health                             | 200 if database/schema/founder binding ready; otherwise 503                                                                              |
| POST /api/cockpit/auth/register             | 403; invite-only founder account                                                                                                         |
| POST /api/cockpit/auth/login                | email/password; 200 user, sets cookies; 401 invalid credentials; 403 non-founder                                                         |
| GET /api/cockpit/auth/me                    | user or null, profile, founder_only=true, development=false                                                                              |
| POST /api/cockpit/auth/logout               | revokes session and clears cookies                                                                                                       |
| GET /api/cockpit/state                      | existing dashboard payload plus founder_controls                                                                                         |
| PUT /api/cockpit/profile                    | existing profile fields, owner fixed by session                                                                                          |
| POST /api/cockpit/campaigns                 | existing fields; returns draft campaign and tracked link; cost is recorded expense, not authorization                                    |
| PATCH /api/cockpit/campaigns/:id            | edit name/destination/source; increments revision and revokes approval                                                                   |
| POST /api/cockpit/campaigns/:id/approve     | explicit revision, budget_cents, daily_cap_cents; persists approval; never enables live spending                                         |
| POST /api/cockpit/campaigns/:id/simulate    | amount_cents and unique request_id; atomic dry-run ledger constrained by total/daily caps                                                |
| POST /api/cockpit/campaigns/:id/execute     | always 423 SPENDING_DISABLED; no provider credentials, wallet, or payment integration                                                    |
| POST /api/cockpit/controls/pause            | reason; immediately pauses agents and simulations, invalidates approvals                                                                 |
| POST /api/cockpit/controls/resume           | resumes planning only; approvals must be renewed; live spending stays disabled                                                           |
| POST /api/cockpit/agents/run                | agent=planner/copywriter/analyst, brief; audited OpenAI structured proposal; never approves or executes                                  |
| GET /api/cockpit/admin                      | health, controls, campaigns, recent audit entries and agent runs                                                                         |
| GET/POST /api/cockpit/workspace/:kind       | content/template/schedule persistence                                                                                                    |
| PUT/DELETE /api/cockpit/workspace/:kind/:id | owned workspace record only                                                                                                              |
| GET /go/:creator/:slug                      | active tracked link; records anonymous click then redirects; honors DNT                                                                  |
| POST /api/cockpit/conversions               | external_id, optional tracked_link_id/session_id, revenue; duplicate reference 409; manual evidence remains unverified                   |
| POST /api/conversions/webhook               | HMAC SHA256 of `timestamp.rawBody`, headers x-np-timestamp/x-np-signature; 5-minute window, unique external_id; verified server evidence |

All privileged mutations require same-origin browser requests; malformed inputs 400,
unauthenticated access 401, non-founder access 403, stale approval or cap conflict 409,
paused action 423, unconfigured dependencies 503. Server-only environment variables are
never exposed through Vite. Audit rows cannot be updated or deleted by the service role.
Paid execution has no implementation and the database rejects live-enabled controls.

Provider OAuth and peer swaps from the multi-customer local demo are explicitly unavailable
in founder mode. No synthetic provider counts or conversions are presented as verified.
