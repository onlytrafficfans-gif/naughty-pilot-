# Naughty Pilot — creator growth cockpit

A working self-hosted creator traffic, campaign attribution, and peer-promotion application. Twelve working screens: Home, Traffic, Campaigns, Peer Swap, Links, Analytics, Account, Automation, Templates, Content Library, Subscriptions, and Settings. No production data is seeded.

## Run

Requires **Node 24+** (uses built-in SQLite), npm, and a persistent writable disk.

```sh
npm install --package-lock=false
npm run dev
```

The Express/Vite app listens on `127.0.0.1:4178`. Register an account, confirm you are 18+, and complete the short onboarding to create your first tracked link. Optional website and integration setup can be skipped. Passwords use salted scrypt hashes; sessions use hashed random tokens and HttpOnly cookies. SQLite persists in `.data/cockpit.sqlite` (ignored by Git).

Environment settings:

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port; defaults to 4178 |
| `HOST` | Bind address; defaults to 127.0.0.1 |
| `NP_BASE_URL` | Public origin used in tracked links, website scripts, and origin checks; defaults to the local server address |
| `NP_DB_PATH` | SQLite file path on a persistent volume |
| `NP_PATREON_CLIENT_ID` | Patreon OAuth app client ID |
| `NP_PATREON_CLIENT_SECRET` | Patreon OAuth app secret; enter securely in environment settings |
| `NP_ADMIN_USER_ID` | Exact ID of a registered administrator; grants access to the separate `/admin` route |

Account IDs are available to their owners in `/api/cockpit/auth/me`. Never assign admin access by a claimed signup email. Creator navigation has no admin controls.

## Data and attribution

- Unique `/go/{creator}/{campaign-slug}` links record anonymous sessions and redirect with UTM, `np_link`, and `np_session` parameters. Paused links return 404. Browser Do Not Track and `?np_no_track=1` skip recording and cookies.
- Tracked-link clicks, website visits, and subscription clicks are distinct events. Every event belongs to a creator and can reference a campaign, source, peer, and link. Device categories are inferred from user agent; country is **not** inferred. Referrer query strings are omitted. Visitor uniqueness is session-based, not a count of identified people.
- Account → Website creates a first-party script and DNS TXT ownership record. The collector accepts only verified website origins and supported event types. The script starts tracking only after the website grants `window.NP_TRACKING_CONSENT = true`, respects Do Not Track, and retains link attribution across page navigations. The script never sends conversion reports. Public tracking tokens are not credentials.
- Creators record actual conversions and revenue in Analytics. Reports are **creator-provided**, not synced platform subscriber data. A report with a link or recorded session can be credited to that campaign. Reports without attribution remain uncertain and are excluded from campaign revenue. Optional references prevent duplicate reports; never enter subscriber names or emails.
- First-touch and last-touch attribution use recorded session history. The default is last tracked touch. Conversion rate uses unique recorded visitors as its denominator. Revenue is reported in USD; ROI appears only when campaign cost is entered. Arbitrary cross-device attribution is not claimed.
- Home uses the primary platform’s subscriber count. Patreon totals carry official API evidence; manually entered totals remain creator-reported. Platform totals never create campaign conversions or imply campaign attribution.

## Peer Swap

Creators opt into discovery in Account. Filters cover niche, audience tier, recorded 30-day traffic range, platform, promotion type, optional region, and availability. Traffic tiers use first-party unique visitors; engagement and platform conversion-performance tiers remain unverified until official data exists. Audience overlap is unavailable rather than guessed. Match labels use self-reported niche and audience tier. Reliability and completed swap history are not fabricated.

Swap requests support accept, decline, and a schedule counterproposal. Acceptance atomically creates one owned campaign/link per creator. Each creator shares their **partner’s** tracking link. Results expose only aggregate traffic/conversions/revenue in both directions. Fairness compares unique visitor volume: ≥80% is Balanced, ≥50% Uneven, otherwise Needs review. Zero traffic is Not enough data. Creators can block or report peers. Notifications cover requests, acceptance, start/end dates, conversion milestones, disconnected accounts, stale tracking, and integration failures without repeating the same milestone.

## Integration boundaries

Adapters expose `connect`, `disconnect`, `sync`, `getMetrics`, `getCampaignMetrics`, `getProfile`, and `getStatus` independently of the attribution engine. Supported provider slots include the subscription platform, website, analytics, search, social, community, and email providers.

Account has OnlyFans, Fansly, Patreon, and Pornhub connections. Patreon uses its official OAuth API, with creator-authorized campaign/member access and pagination. It counts active patrons with a positive currently entitled amount; active free members are displayed separately. It refreshes approximately every five minutes, supports Sync now, and retains the last successful total with a stale/error indication when authorization fails. No subscriber identities are stored.

Register a Patreon OAuth app with callback `https://YOUR-APP-DOMAIN/api/cockpit/oauth/patreon/callback`, matching `NP_BASE_URL`. Configure `NP_PATREON_CLIENT_ID` and `NP_PATREON_CLIENT_SECRET` securely, then choose Account → Connect Patreon. Allow HTTPS egress to `www.patreon.com`. In proxy-managed cloud environments, start Node with `NODE_USE_ENV_PROXY=1`. The current tests use controlled API fixtures; real OAuth access requires your app credentials and an accessible callback.

OAuth tokens are encrypted in SQLite using a local, permission-restricted key at `${NP_DB_PATH}.key` (default `.data/cockpit.sqlite.key`). Persist and back up this key with the database; losing it prevents token decryption. Disconnect deletes local credentials and stops syncing. Revoke the app through Patreon to remove the provider-side grant.

OnlyFans, Fansly, and Pornhub currently accept public creator URLs and optional creator-reported paid subscriber totals. Verified live API adapters are not configured for them. Free followers are not paid subscribers. Other provider slots return **official API setup required**. No scraping, password collection, simulated OAuth, or bypassing third-party restrictions is used.

Development mode offers labeled sample traffic and peer profiles in Account. Sample swaps can simulate a sample partner accepting; real peers must accept through their own authenticated accounts. Sample controls are disabled in production. Clear development samples before using the same database in production.

The previous AI text handlers are retained as inactive source files; they are no longer exposed by the cockpit server or used in the creator interface. OpenAI credentials are not required for the new product workflow.

## Validation

```sh
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Patreon tests cover session-bound OAuth state, replay rejection, ownership, pagination, paid/free membership, encrypted credentials, refresh, disconnect, and failed-sync retention. Backend tests exercise registration/login/ownership, tracked redirects, conversion reporting, verified-origin collection, bilateral swaps, fairness, integration failures, samples, persistence, export, and deletion. Browser tests cover desktop and 390px mobile flows, onboarding, tracked links/QR/pause, campaign comparison, source filtering, conversion updates, website diagnostics, integration errors, sample swaps, and console/runtime errors. Browser tests start a separate server on port 4180 with `.data/browser.sqlite`; they never populate the default creator database. System Chromium is used by default; set `PLAYWRIGHT_CHROMIUM_PATH` to another installed compatible browser or install Chromium through Playwright and update the path.

## Production

```sh
npm run build
NODE_ENV=production HOST=0.0.0.0 NP_BASE_URL=https://your-domain.example NP_DB_PATH=/persistent/cockpit.sqlite node server.mjs
```

Use a trusted HTTPS reverse proxy, persistent storage, restricted file permissions, and database backups. Production requires an HTTPS `NP_BASE_URL`, uses secure session cookies, disables Vite, and serves `dist` with the same authenticated backend. Test proxy/origin settings on your actual domain. This release uses a **single Node service**: the previous static Vercel configuration was removed because an ephemeral serverless filesystem would not safely retain this SQLite database. A Vercel deployment needs a durable database adapter first.

Before a public multi-tenant launch, add email verification/recovery, operational monitoring, provider-specific OAuth/webhooks, and operator-specific legal/support/retention information. Terms and privacy disclosures are supplied in the UI, and creator data can be exported or deleted. The public event collector is origin-checked, consent-gated in the script, and rate-limited, but web analytics remains susceptible to automated/spoofed events; do not treat it as payment evidence. Operators must meet applicable consent and privacy requirements.

## Hosted release

`render.yaml` defines a Render Node web service with one instance and a persistent 1 GB disk. Its Starter plan and disk are paid resources; review hosting charges in Render before creating it. The database and encrypted-token key both live under `/var/data`. The application uses Render's `RENDER_EXTERNAL_URL` for its public origin automatically; set `NP_BASE_URL` when using a custom domain. `/healthz` checks database availability without exposing account data. `NP_TRUST_PROXY_HOPS=1` allows rate limiting by the client address behind Render's trusted proxy.

To deploy the current source, push this release to your connected GitHub repository, then create a Render Blueprint using `render.yaml`. Verify the resulting HTTPS URL, sign up, and create a tracked link. Patreon credentials are optional for launch; configure them in Render's environment settings and register the OAuth callback before connecting Patreon. OnlyFans/Fansly/Pornhub live syncing remains unavailable until verified adapters are configured.

The development environment is not a public deployment. A hosting account/connection is required to publish the service. Do not replace the persistent service with a static-only preview: that would omit authentication, tracking, and storage.

Run `npm run test:release` for the release checks. Production tests use a temporary database, exercise every creator route, secure cookies, origin checks, disabled sample controls, health checks, and account/token persistence across server restart. Server shutdown handles SIGTERM/SIGINT and closes SQLite cleanly.

## Approved dashboard UI foundation

The supplied dashboard screenshot now guides the React shell and Home screen: the NP logo, scarlet controls, dark cards, campaign hero, traffic-source grid, link analytics, growth plan, campaign presets, Pure Swap panel, and recent activity. Existing authentication, ownership, analytics, accounts, and swaps remain connected to the backend. Global search opens matching campaign results, filters sources, and navigates to tracked links. Campaign templates prefill editable forms; they do not publish external posts. The sidebar contains twelve working product routes. Automation is a promotion reminder schedule, and Subscriptions manages creator platform connections; neither claims unsupported external posting or app-plan billing.

The supplied repository's branded images are used for the hero and template cards. Peer badges use actual display-name initials, not invented creator photos or online statuses. Subscribers and conversion evidence stay labeled; the screenshot's example totals and percentage increases are not seeded as real data. The small hero chart is labeled as recorded visitor traffic. Development samples remain explicitly labeled and isolated.

Browser checks cover the approved local React/browser fallback on 1536px desktop and 390px mobile, including search, campaign preset selection, source-card filtering, creation after filtering, dashboard metrics, existing creator workflows, console errors, and horizontal overflow. `work/dashboard-foundation-desktop.png` and `work/dashboard-foundation-mobile.png` capture the viewport; `work/cockpit-*.png` capture the full dashboard. Public hosting is a separate step.

## Complete-screen interaction pass

Content Library stores creator-owned public URL references, captions, and source labels. Templates includes built-in presets plus persistent custom presets. Automation saves, edits, completes, cancels, and removes promotion reminders; due notifications are generated while the creator uses the app. These are not unattended external posts or email/push jobs. Subscriptions exposes the four platform connections, and Settings exposes profile and privacy/account controls. Mobile More provides every additional screen. Owned records are validated, persisted, exported, and deleted with the creator account.

Search supports empty results, Escape, Enter, exact campaign results, and exact link details with copy/QR/results actions. Recent Activity opens the complete feed, creator badges open a proposal for the selected creator, and Growth Plan identifies the first unfinished step. Tests now include 16 backend/production cases and expanded desktop/mobile flows across all twelve screens.
