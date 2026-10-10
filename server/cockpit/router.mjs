import express from "express";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { id, now } from "./store.mjs";
import { createPatreonService, SUBSCRIPTION_PROVIDERS } from "./patreon.mjs";
import {
  SOURCES,
  PROVIDERS,
  SWAP_TYPES,
  aggregate,
  createAdapter,
} from "./metrics.mjs";
const hash = (s) => createHash("sha256").update(s).digest("hex");
const cookie = (req) =>
  Object.fromEntries(
    (req.headers.cookie || "").split(";").map((v) => v.trim().split("=")),
  );
const error = (status, message) =>
  Object.assign(new Error(message), { status });
const safeUrl = (value) => {
  try {
    const u = new URL(value);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
      throw 0;
    return u.href;
  } catch {
    throw error(400, "Enter a valid http or https URL without credentials.");
  }
};
const text = (value, name, max = 160) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw error(400, `${name} is required (maximum ${max} characters).`);
  return value.trim();
};
const date = (value) => {
  if (!value || !Number.isFinite(Date.parse(value)))
    throw error(400, "Enter a valid date.");
  return new Date(value).toISOString();
};
const publicProfile = (p) => ({
  id: p.id,
  creator_id: p.creator_id,
  display_name: p.display_name,
  niche: p.niche,
  audience_tier: p.audience_tier,
  engagement_tier: p.engagement_tier || "Not verified",
  traffic_tier: p.traffic_tier || "Not verified",
  promotion_types: p.promotion_types || [],
  platform: p.platform,
  region: p.show_region ? p.region : "",
  demo: !!p.demo,
  availability: p.availability !== false,
  conversion_tier: "Not verified",
  reliability: "No completed swaps yet",
});
export function createCockpitRouter(
  store,
  {
    development = true,
    baseUrl = "http://127.0.0.1:4178",
    providerFetch = globalThis.fetch,
    patreonConfig,
  } = {},
) {
  const router = express.Router();
  const patreon = createPatreonService(store, {
    baseUrl,
    fetchImpl: providerFetch,
    ...(patreonConfig ? { config: patreonConfig } : {}),
  });
  router.syncDueAccounts = patreon.syncDue;
  const counters = new Map();
  const limit = (req, scope, max) => {
    const key = scope + ":" + req.ip;
    const time = Date.now();
    const bucket = counters.get(key);
    if (!bucket || bucket.end < time)
      counters.set(key, { count: 1, end: time + 60000 });
    else if (++bucket.count > max)
      throw error(429, "Too many requests. Please wait a minute.");
    if (counters.size > 10000)
      for (const [k, v] of counters) if (v.end < time) counters.delete(k);
  };
  const origin = new URL(baseUrl).origin;
  router.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.path.startsWith("/api/cockpit"))
      res.setHeader("Cache-Control", "no-store");
    if (
      req.path.startsWith("/api/cockpit") &&
      req.method !== "GET" &&
      req.headers.origin &&
      req.headers.origin !== origin
    )
      return res.status(403).json({ error: "Request origin is not allowed." });
    next();
  });
  const auth = (req, res, next) => {
    try {
      const token = cookie(req).np_session;
      const session =
        token &&
        store.db
          .prepare("SELECT * FROM sessions WHERE token=? AND expires>?")
          .get(hash(token), Date.now());
      if (!session) throw error(401, "Please sign in to continue.");
      req.user = store.db
        .prepare("SELECT id,email,created_at FROM users WHERE id=?")
        .get(session.user_id);
      next();
    } catch (e) {
      next(e);
    }
  };
  const route = (method, path, fn, secure = true) =>
    router[method](path, ...(secure ? [auth] : []), async (req, res, next) => {
      try {
        await fn(req, res);
      } catch (e) {
        next(e);
      }
    });
  const owned = (kind, key, owner) => {
    const item = store.get(kind, key);
    if (!item || item.creator_id !== owner) throw error(404, "Not found.");
    return item;
  };
  const profile = (owner) => store.list("profile", owner)[0];
  const notify = (owner, message, type = "campaign") =>
    store.add("notification", owner, { message, type, read: false });
  const notifyOnce = (owner, key, message, type = "campaign") => {
    const exists = store.list("notification", owner).some((n) => n.key === key);
    if (!exists)
      store.add("notification", owner, { key, message, type, read: false });
  };
  const session = (res, user) => {
    const token = randomBytes(32).toString("hex");
    store.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(hash(token), user, Date.now() + 7 * 86400000);
    res.cookie("np_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: !development,
      maxAge: 7 * 86400000,
      path: "/",
    });
  };
  route(
    "post",
    "/api/cockpit/auth/register",
    (req, res) => {
      limit(req, "auth", 15);
      const email = text(req.body.email, "Email").toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw error(400, "Enter a valid email.");
      const password = text(req.body.password, "Password", 200);
      if (password.length < 10)
        throw error(400, "Use at least 10 characters for your password.");
      if (req.body.adult !== true || req.body.terms !== true)
        throw error(
          400,
          "You must confirm you are 18+ and accept the terms and privacy policy.",
        );
      const salt = randomBytes(16).toString("hex"),
        user = id();
      try {
        store.db
          .prepare("INSERT INTO users VALUES(?,?,?,?)")
          .run(
            user,
            email,
            salt + ":" + scryptSync(password, salt, 64).toString("hex"),
            now(),
          );
      } catch (e) {
        if (e.code?.includes("CONSTRAINT") || e.message.includes("UNIQUE"))
          throw error(409, "An account already exists with this email.");
        throw e;
      }
      session(res, user);
      res.status(201).json({ user: { id: user, email } });
    },
    false,
  );
  route(
    "post",
    "/api/cockpit/auth/login",
    (req, res) => {
      limit(req, "auth", 15);
      const email = text(req.body.email, "Email").toLowerCase(),
        password = text(req.body.password, "Password", 200);
      const user = store.db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(email);
      const [salt, expected] = (
        user?.password || "missing:" + "0".repeat(128)
      ).split(":");
      const computed = scryptSync(password, salt, 64);
      if (!user || !timingSafeEqual(computed, Buffer.from(expected, "hex")))
        throw error(401, "Email or password is incorrect.");
      session(res, user.id);
      res.json({ user: { id: user.id, email: user.email } });
    },
    false,
  );
  route(
    "get",
    "/api/cockpit/auth/me",
    (req, res) => {
      const token = cookie(req).np_session;
      const session =
        token &&
        store.db
          .prepare("SELECT * FROM sessions WHERE token=? AND expires>?")
          .get(hash(token), Date.now());
      const user = session
        ? store.db
            .prepare("SELECT id,email,created_at FROM users WHERE id=?")
            .get(session.user_id)
        : null;
      res.json({
        user: user || null,
        profile: user ? profile(user.id) || null : null,
        development,
      });
    },
    false,
  );
  route("post", "/api/cockpit/auth/logout", (req, res) => {
    store.db
      .prepare("DELETE FROM sessions WHERE token=?")
      .run(hash(cookie(req).np_session));
    res.clearCookie("np_session", { path: "/" });
    res.json({ ok: true });
  });
  route("put", "/api/cockpit/profile", (req, res) => {
    const old = profile(req.user.id),
      b = req.body;
    const p = {
      ...(old || {
        id: req.user.id,
        creator_id: req.user.id,
        created_at: now(),
      }),
      display_name: text(b.display_name, "Display name", 80),
      niche: text(b.niche || "Lifestyle", "Niche", 80),
      platform: text(b.platform || "Subscription platform", "Platform", 80),
      destination: safeUrl(b.destination),
      website: b.website ? safeUrl(b.website) : "",
      audience_tier: b.audience_tier || "Under 1k",
      discovery: !!b.discovery,
      show_region: !!b.show_region,
      region: String(b.region || "").slice(0, 80),
      availability: b.availability !== false,
      promotion_types: (b.promotion_types || ["Link Swap"]).filter((t) =>
        SWAP_TYPES.includes(t),
      ),
      current_subscribers:
        b.current_subscribers === null || b.current_subscribers === undefined
          ? null
          : Math.max(0, Math.floor(Number(b.current_subscribers) || 0)),
      onboarded: !!b.onboarded,
      tracking_consent: !!b.tracking_consent,
    };
    store.save("profile", p);
    res.json(p);
  });
  function campaign(owner, b) {
    const start = date(b.start_date || now()),
      end = b.end_date ? date(b.end_date) : null;
    if (end && end < start)
      throw error(400, "End date must be after start date.");
    const c = store.add("campaign", owner, {
      name: text(b.name, "Campaign name", 100),
      source: SOURCES.includes(b.source) ? b.source : "Other",
      destination: safeUrl(b.destination),
      start_date: start,
      end_date: end,
      peer_id: b.peer_id || null,
      cost: Math.max(0, Number(b.cost) || 0),
      status: "active",
      demo: !!b.demo,
      swap_id: b.swap_id || null,
    });
    const l = store.add("link", owner, {
      campaign_id: c.id,
      source: c.source,
      destination: c.destination,
      peer_id: c.peer_id,
      content_id: String(b.content_id || "").slice(0, 160),
      created_by: owner,
      slug: id().slice(0, 8),
      status: "active",
      demo: c.demo,
    });
    store.save("campaign", { ...c, link_id: l.id });
    return { ...c, link_id: l.id };
  }
  route("post", "/api/cockpit/campaigns", (req, res) => {
    const c = store.transaction(() => campaign(req.user.id, req.body));
    res.status(201).json(c);
  });
  route("patch", "/api/cockpit/links/:id", (req, res) => {
    const l = owned("link", req.params.id, req.user.id);
    if (!["active", "paused"].includes(req.body.status))
      throw error(400, "Invalid status.");
    res.json(store.save("link", { ...l, status: req.body.status }));
  });
  const workspaceKinds = new Set(["content", "template", "schedule"]);
  const workspaceKind = (req) => {
    if (!workspaceKinds.has(req.params.kind)) throw error(404, "Not found.");
    return req.params.kind;
  };
  const workspaceValues = (req, kind) => {
    const b = req.body;
    const v = {
      title: text(b.title, "Title", 100),
      source: text(b.source || "Reddit", "Source", 80),
      caption: String(b.caption || "").slice(0, 2000),
    };
    if (!SOURCES.includes(v.source))
      throw error(400, "Choose a supported traffic source.");
    if (kind === "content" || b.url) v.url = safeUrl(b.url);
    if (kind === "schedule") {
      v.due_at = date(b.due_at);
      v.status = b.status || "pending";
      if (!["pending", "completed", "cancelled"].includes(v.status))
        throw error(400, "Invalid schedule status.");
      if (b.campaign_id) {
        owned("campaign", b.campaign_id, req.user.id);
        v.campaign_id = b.campaign_id;
      }
    }
    return v;
  };
  route("get", "/api/cockpit/workspace/:kind", (req, res) =>
    res.json({ items: store.list(workspaceKind(req), req.user.id) }),
  );
  route("post", "/api/cockpit/workspace/:kind", (req, res) => {
    const kind = workspaceKind(req);
    res
      .status(201)
      .json({ item: store.add(kind, req.user.id, workspaceValues(req, kind)) });
  });
  route("put", "/api/cockpit/workspace/:kind/:id", (req, res) => {
    const kind = workspaceKind(req),
      old = owned(kind, req.params.id, req.user.id);
    res.json({
      item: store.save(kind, {
        ...old,
        ...workspaceValues(req, kind),
        updated_at: now(),
      }),
    });
  });
  route("delete", "/api/cockpit/workspace/:kind/:id", (req, res) => {
    const kind = workspaceKind(req);
    owned(kind, req.params.id, req.user.id);
    store.db
      .prepare("DELETE FROM records WHERE kind=? AND id=? AND creator_id=?")
      .run(kind, req.params.id, req.user.id);
    res.json({ ok: true });
  });
  route("get", "/api/cockpit/state", (req, res) => {
    const owner = req.user.id,
      p = profile(owner);
    for (const w of store.list("website", owner)) {
      if (w.last_event && Date.now() - Date.parse(w.last_event) > 86400000) {
        store.save("website", { ...w, status: "stale" });
        notifyOnce(
          owner,
          "stale-" + w.id,
          "Your website has not sent tracking events in 24 hours. Check your installation.",
          "tracking",
        );
      }
    }
    for (const s of store
      .list("swap")
      .filter(
        (s) => [s.from_id, s.to_id].includes(owner) && s.status === "accepted",
      )) {
      if (Date.parse(s.start_date) <= Date.now())
        notifyOnce(
          owner,
          "start-" + s.id,
          "Your peer campaign has reached its scheduled start date.",
          "swap",
        );
      if (Date.parse(s.start_date) + s.duration * 86400000 < Date.now())
        notifyOnce(
          owner,
          "end-" + s.id,
          "Your peer campaign schedule has ended. Review results and mark it complete.",
          "swap",
        );
    }
    const range = {
      from: req.query.from,
      to: req.query.to,
      model: req.query.model,
    };
    for (const reminder of store.list("schedule", owner)) {
      if (
        reminder.status === "pending" &&
        Date.parse(reminder.due_at) <= Date.now()
      )
        notifyOnce(
          owner,
          "schedule-" + reminder.id,
          `Promotion reminder: ${reminder.title}`,
          "schedule",
        );
    }
    const events = store.events(owner),
      conversions = store.conversions(owner);
    const metrics = aggregate(events, conversions, range);
    const campaigns = store.list("campaign", owner).map((c) => {
      const m = aggregate(
        events.filter((e) => e.campaign_id === c.id),
        conversions.filter(
          (e) =>
            (range.model === "first-touch"
              ? e.first_campaign_id || e.campaign_id
              : e.campaign_id) === c.id,
        ),
        range,
      );
      return {
        ...c,
        metrics: m,
        roi: c.cost ? ((m.revenue - c.cost) / c.cost) * 100 : null,
      };
    });
    const links = store.list("link", owner).map((l) => {
      const m = aggregate(
        events.filter((e) => e.tracked_link_id === l.id),
        conversions.filter(
          (e) =>
            (range.model === "first-touch"
              ? e.first_link_id || e.tracked_link_id
              : e.tracked_link_id) === l.id,
        ),
        range,
      );
      return {
        ...l,
        name: campaigns.find((c) => c.id === l.campaign_id)?.name,
        url: `${baseUrl}/go/${owner}/${l.slug}`,
        click_count: m.clicks,
        unique_click_count: m.visitors,
        conversion_count: m.conversions,
        revenue: m.revenue,
      };
    });
    const blocked = store.list("block", owner).map((b) => b.peer_id);
    const trafficTier = (owner) => {
      const metrics = aggregate(store.events(owner), [], {
        from: new Date(Date.now() - 30 * 86400000).toISOString(),
      });
      const n = metrics.visitors;
      return n === 0
        ? "No recorded traffic"
        : n < 100
          ? "Under 100 visits"
          : n < 1000
            ? "100–1k visits"
            : n < 10000
              ? "1k–10k visits"
              : "10k+ visits";
    };
    const peers = store
      .list("profile")
      .filter(
        (v) =>
          v.creator_id !== owner &&
          (development || !v.demo) &&
          v.discovery &&
          !blocked.includes(v.creator_id) &&
          !store.list("block", v.creator_id).some((b) => b.peer_id === owner),
      )
      .map((v) => ({
        ...publicProfile(v),
        traffic_tier: trafficTier(v.creator_id),
        traffic_basis: "First-party unique visitors, last 30 days",
        match:
          p &&
          v.niche.toLowerCase() === p.niche.toLowerCase() &&
          v.audience_tier === p.audience_tier
            ? "Excellent Match"
            : p && v.niche.toLowerCase() === p.niche.toLowerCase()
              ? "Good Match"
              : "Experimental Match",
        match_basis:
          "Based on self-reported niche and audience tier. Performance and overlap are not verified.",
        history: store
          .list("swap")
          .filter(
            (s) =>
              s.status === "completed" &&
              [s.from_id, s.to_id].includes(v.creator_id),
          ).length,
      }));
    const swaps = store
      .list("swap")
      .filter((s) => [s.from_id, s.to_id].includes(owner))
      .map((s) => {
        const partner = profile(s.from_id === owner ? s.to_id : s.from_id);
        const mine = campaigns.find((c) => c.swap_id === s.id),
          other = store
            .list("campaign")
            .find((c) => c.swap_id === s.id && c.creator_id !== owner);
        const received = mine
          ? aggregate(
              events.filter((e) => e.campaign_id === mine.id),
              conversions.filter((c) => c.campaign_id === mine.id),
              range,
            )
          : null;
        const sent = other
          ? aggregate(
              store
                .events(other.creator_id)
                .filter((e) => e.campaign_id === other.id),
              store
                .conversions(other.creator_id)
                .filter((c) => c.campaign_id === other.id),
              range,
            )
          : null;
        const ratio =
          received && sent && Math.max(received.visitors, sent.visitors)
            ? Math.min(received.visitors, sent.visitors) /
              Math.max(received.visitors, sent.visitors)
            : null;
        const partnerLink = other && store.get("link", other.link_id);
        return {
          ...s,
          partner: partner ? publicProfile(partner) : null,
          received,
          sent,
          fairness:
            ratio === null
              ? "Not enough data"
              : ratio >= 0.8
                ? "Balanced"
                : ratio >= 0.5
                  ? "Uneven"
                  : "Needs review",
          share_url: partnerLink
            ? `${baseUrl}/go/${other.creator_id}/${partnerLink.slug}`
            : null,
        };
      });
    res.json({
      workspace: {
        content: store.list("content", owner),
        template: store.list("template", owner),
        schedule: store.list("schedule", owner),
      },
      profile: p,
      user: req.user,
      development,
      metrics,
      campaigns,
      links,
      peers,
      swaps,
      accounts: store.list("account", owner),
      integration_setup: { Patreon: patreon.setup() },
      subscriber_count: (() => {
        const account = store
          .list("account", owner)
          .find(
            (a) => a.provider === p?.platform && a.status !== "disconnected",
          );
        if (account?.metrics?.evidence === "official_api")
          return {
            value: account.metrics.current_subscribers,
            evidence: "official_api",
            provider: account.provider,
            measured_at: account.metrics.measured_at,
            stale:
              account.status !== "connected" ||
              Date.now() - Date.parse(account.metrics.measured_at) > 15 * 60000,
          };
        if (
          account?.manual_subscribers !== undefined &&
          account.manual_subscribers !== null
        )
          return {
            value: account.manual_subscribers,
            evidence: "creator_reported",
            provider: account.provider,
            measured_at: account.reported_at,
          };
        return {
          value: p?.current_subscribers ?? null,
          evidence: "creator_reported",
          provider: p?.platform,
        };
      })(),
      websites: store.list("website", owner),
      notifications: store.list("notification", owner).reverse().slice(0, 30),
      events: events.slice(-30).reverse(),
      sources: SOURCES,
      providers: PROVIDERS,
      swap_types: SWAP_TYPES,
      has_demo: events.some((e) => e.demo),
      blocks: store.list("block", owner),
      attribution_model: req.query.model || "last-touch",
    });
  });
  route("post", "/api/cockpit/conversions", (req, res) => {
    const b = req.body;
    const link = b.tracked_link_id
      ? owned("link", b.tracked_link_id, req.user.id)
      : null;
    const revenue = Number(b.revenue);
    if (!Number.isFinite(revenue) || revenue < 0)
      throw error(400, "Revenue must be a non-negative number.");
    const sessionId = b.session_id || id(),
      history = store
        .events(req.user.id)
        .filter((e) => e.session_id === sessionId && e.tracked_link_id);
    const first = history[0],
      last = history.at(-1);
    const touched = last ? store.get("link", last.tracked_link_id) : link;
    const c = {
      id: id(),
      creator_id: req.user.id,
      external_id: b.external_id ? text(b.external_id, "Reference", 100) : null,
      timestamp: now(),
      tracked_link_id: touched?.id || null,
      campaign_id: touched?.campaign_id || null,
      source_id: touched?.source || null,
      peer_id: touched?.peer_id || null,
      first_source_id: first?.source_id || touched?.source || null,
      first_link_id: first?.tracked_link_id || touched?.id || null,
      first_campaign_id: first?.campaign_id || touched?.campaign_id || null,
      session_id: sessionId,
      revenue,
      verified: !!touched,
      attribution: touched
        ? "creator-provided tracked-link"
        : "unverified creator report",
      evidence: "creator-provided",
      demo: false,
    };
    try {
      store.db
        .prepare("INSERT INTO conversions VALUES(?,?,?,?,?)")
        .run(c.id, c.creator_id, c.external_id, c.timestamp, JSON.stringify(c));
    } catch (e) {
      if (e.message.includes("UNIQUE"))
        throw error(409, "This conversion reference was already recorded.");
      throw e;
    }
    store.add("revenue", req.user.id, {
      conversion_id: c.id,
      amount: revenue,
      currency: "USD",
      evidence: c.evidence,
    });
    if (touched) {
      const total = store
        .conversions(req.user.id)
        .filter(
          (v) => v.campaign_id === touched.campaign_id && v.verified,
        ).length;
      if (total === 5)
        notifyOnce(
          req.user.id,
          "milestone-" + touched.campaign_id,
          "Your campaign reached five attributed subscriber reports.",
          "milestone",
        );
      if (total === 10)
        notifyOnce(
          req.user.id,
          "performing-" + touched.campaign_id,
          "Your campaign reached ten attributed reports. Review its performance.",
          "campaign",
        );
    }
    notify(
      req.user.id,
      touched
        ? "A creator-reported subscriber was attributed to your campaign."
        : "A subscriber report was saved without verified campaign attribution.",
    );
    res.status(201).json(c);
  });
  route("post", "/api/cockpit/oauth/patreon/start", (req, res) => {
    limit(req, "oauth", 10);
    res.json(patreon.begin(req.user.id, cookie(req).np_session));
  });
  route("get", "/api/cockpit/oauth/patreon/callback", async (req, res) => {
    limit(req, "oauth-callback", 10);
    try {
      const account = await patreon.callback(
        req.user.id,
        cookie(req).np_session,
        {
          state: req.query.state,
          code: req.query.code,
          denied: !!req.query.error,
        },
      );
      res.setHeader("Referrer-Policy", "no-referrer");
      res.redirect(
        303,
        "/account?patreon=" +
          (account.status === "connected" ? "connected" : "sync_error"),
      );
    } catch (e) {
      if (e.code === "invalid_state") throw e;
      res.setHeader("Referrer-Policy", "no-referrer");
      res.redirect(
        303,
        "/account?patreon=" +
          (e.code === "denied" ? "cancelled" : "authorization_error"),
      );
    }
  });
  route("post", "/api/cockpit/accounts", async (req, res) => {
    const provider = req.body.provider;
    if (!PROVIDERS.includes(provider)) throw error(400, "Unknown provider.");
    if (provider === "Patreon")
      throw error(
        400,
        "Use Connect Patreon to authorize your account through Patreon.",
      );
    const result = await createAdapter(provider).connect();
    const old = store
      .list("account", req.user.id)
      .find((a) => a.provider === provider);
    const url = req.body.url ? safeUrl(req.body.url) : "";
    const hosts = {
      OnlyFans: ["onlyfans.com"],
      Fansly: ["fansly.com"],
      Pornhub: ["pornhub.com"],
    };
    if (hosts[provider]) {
      if (!url)
        throw error(
          400,
          "Add your public creator page URL. Do not supply platform passwords or session cookies.",
        );
      const hostname = new URL(url).hostname;
      if (
        !hosts[provider].some(
          (h) => hostname === h || hostname.endsWith("." + h),
        )
      )
        throw error(400, `Use a public ${provider} creator page URL.`);
    }
    let manual = old?.manual_subscribers ?? null;
    if (
      req.body.manual_subscribers !== undefined &&
      req.body.manual_subscribers !== ""
    ) {
      manual = Number(req.body.manual_subscribers);
      if (!Number.isSafeInteger(manual) || manual < 0)
        throw error(
          400,
          "Subscriber count must be a non-negative whole number.",
        );
    }
    const account = store.save("account", {
      ...(old || { id: id(), creator_id: req.user.id, created_at: now() }),
      provider,
      ...result,
      url,
      manual_subscribers: manual,
      reported_at: manual !== null ? now() : null,
      last_sync: null,
    });
    res.json(account);
  });
  route("post", "/api/cockpit/accounts/:id/sync", async (req, res) => {
    const account = owned("account", req.params.id, req.user.id);
    if (account.provider === "Patreon") {
      limit(req, "patreon-sync", 6);
      return res.json(await patreon.sync(account));
    }
    const result = await createAdapter(account.provider).sync();
    store.add("sync", req.user.id, { account_id: account.id, ...result });
    notify(
      req.user.id,
      `${account.provider}: ${result.message}`,
      "integration",
    );
    res.json(
      store.save("account", { ...account, ...result, last_attempt: now() }),
    );
  });
  route("delete", "/api/cockpit/accounts/:id", (req, res) => {
    const account = owned("account", req.params.id, req.user.id);
    if (account.provider === "Patreon") patreon.disconnect(account);
    else
      store.save("account", {
        ...account,
        status: "disconnected",
        message: "Disconnected by you.",
      });
    notify(req.user.id, `${account.provider} was disconnected.`, "integration");
    res.json({ ok: true });
  });
  route("post", "/api/cockpit/websites", (req, res) => {
    const url = safeUrl(req.body.url),
      domain = new URL(url).hostname;
    const existing = store
      .list("website", req.user.id)
      .find((w) => w.domain === domain);
    if (existing) return res.json(existing);
    res.status(201).json(
      store.add("website", req.user.id, {
        url,
        domain,
        token: randomBytes(24).toString("hex"),
        verification: id(),
        verified: false,
        last_event: null,
        status: "awaiting_verification",
      }),
    );
  });
  route("post", "/api/cockpit/websites/:id/verify", async (req, res) => {
    const w = owned("website", req.params.id, req.user.id);
    let verified = false;
    try {
      const records = await resolveTxt(`_naughtypilot.${w.domain}`);
      verified = records.some(
        (r) => r.join("") === `np-verification=${w.verification}`,
      );
    } catch {}
    const updated = store.save("website", {
      ...w,
      verified,
      status: verified ? "awaiting_events" : "awaiting_verification",
    });
    if (!verified)
      return res.status(422).json({
        error:
          "Verification TXT record was not found. Add the record shown and allow DNS to update.",
        website: updated,
      });
    res.json(updated);
  });
  route("post", "/api/cockpit/websites/:id/test", (req, res) => {
    const w = owned("website", req.params.id, req.user.id);
    res.json({
      verified: w.verified,
      installed: !!w.last_event,
      last_event: w.last_event,
      status: w.status,
      message: w.last_event
        ? "Events have been received."
        : "No events received. Install the script and grant tracking consent on your website.",
    });
  });
  route("post", "/api/cockpit/swaps", (req, res) => {
    const b = req.body,
      p = profile(req.user.id),
      other = profile(b.peer_id);
    if (
      !p ||
      !other ||
      !other.discovery ||
      other.availability === false ||
      other.creator_id === req.user.id
    )
      throw error(400, "Choose an available creator.");
    if (
      store.list("block", req.user.id).some((v) => v.peer_id === b.peer_id) ||
      store.list("block", b.peer_id).some((v) => v.peer_id === req.user.id)
    )
      throw error(403, "This creator is unavailable.");
    if (!SWAP_TYPES.includes(b.type))
      throw error(400, "Choose a promotion type.");
    const duration = Number(b.duration);
    if (!Number.isInteger(duration) || duration < 1 || duration > 90)
      throw error(400, "Duration must be 1–90 days.");
    const s = store.add("swap", req.user.id, {
      from_id: req.user.id,
      to_id: b.peer_id,
      type: b.type,
      platform: text(b.platform, "Platform", 80),
      duration,
      start_date: date(b.start_date),
      note: String(b.note || "").slice(0, 500),
      status: "pending",
      demo: !!other.demo,
    });
    notify(
      b.peer_id,
      `${p.display_name} sent you a ${b.type} request.`,
      "swap",
    );
    res.status(201).json(s);
  });
  route("post", "/api/cockpit/swaps/:id/respond", (req, res) => {
    const s = store.get("swap", req.params.id),
      owner = req.user.id,
      action = req.body.action;
    if (!s || ![s.from_id, s.to_id].includes(owner))
      throw error(404, "Swap not found.");
    if (
      store.list("block", s.from_id).some((b) => b.peer_id === s.to_id) ||
      store.list("block", s.to_id).some((b) => b.peer_id === s.from_id)
    )
      throw error(403, "This collaboration is blocked.");
    if (action === "complete") {
      if (s.status !== "accepted")
        throw error(409, "Only accepted swaps can be completed.");
      store.save("swap", { ...s, status: "completed" });
      notify(
        s.from_id,
        "Your peer campaign is complete. Review the results.",
        "swap",
      );
      notify(
        s.to_id,
        "Your peer campaign is complete. Review the results.",
        "swap",
      );
      return res.json({ ok: true });
    }
    const responder = s.status === "countered" ? s.from_id : s.to_id;
    if (owner !== responder || !["pending", "countered"].includes(s.status))
      throw error(403, "This request is not awaiting your response.");
    if (action === "counter") {
      const start = date(req.body.start_date),
        duration = Number(req.body.duration);
      if (!Number.isInteger(duration) || duration < 1 || duration > 90)
        throw error(400, "Duration must be 1–90 days.");
      if (s.status === "countered")
        throw error(409, "Accept or decline this counter proposal.");
      store.save("swap", {
        ...s,
        status: "countered",
        start_date: start,
        duration,
        note: String(req.body.note || "").slice(0, 500),
      });
      notify(s.from_id, "Your peer proposed a new schedule.", "swap");
      return res.json({ ok: true });
    }
    if (!["accept", "decline"].includes(action))
      throw error(400, "Invalid response.");
    store.transaction(() => {
      store.save("swap", {
        ...s,
        status: action === "accept" ? "accepted" : "declined",
      });
      if (action === "accept")
        for (const [a, b] of [
          [s.from_id, s.to_id],
          [s.to_id, s.from_id],
        ]) {
          const p = profile(a),
            partner = profile(b);
          campaign(a, {
            name: `${s.type} · ${partner.display_name}`,
            source: "Peer swaps",
            destination: p.destination,
            start_date: s.start_date,
            end_date: new Date(
              Date.parse(s.start_date) + s.duration * 86400000,
            ).toISOString(),
            peer_id: b,
            swap_id: s.id,
            demo: s.demo,
          });
        }
      notify(
        s.from_id,
        `Your peer swap was ${action === "accept" ? "accepted" : "declined"}.`,
        "swap",
      );
      notify(
        s.to_id,
        action === "accept"
          ? "Your swap links are ready to share."
          : "Swap declined.",
        "swap",
      );
    });
    res.json({ ok: true });
  });
  route("post", "/api/cockpit/peers/:id/block", (req, res) => {
    if (req.params.id === req.user.id)
      throw error(400, "Cannot block yourself.");
    store.add("block", req.user.id, { peer_id: req.params.id });
    res.json({ ok: true });
  });
  route("delete", "/api/cockpit/peers/:id/block", (req, res) => {
    for (const b of store
      .list("block", req.user.id)
      .filter((b) => b.peer_id === req.params.id))
      store.db.prepare("DELETE FROM records WHERE id=?").run(b.id);
    res.json({ ok: true });
  });
  route("post", "/api/cockpit/reports", (req, res) => {
    res.status(201).json(
      store.add("report", req.user.id, {
        peer_id: req.body.peer_id,
        reason: text(req.body.reason, "Report reason", 500),
        status: "open",
      }),
    );
  });
  route("post", "/api/cockpit/notifications/read", (req, res) => {
    for (const n of store.list("notification", req.user.id))
      store.save("notification", { ...n, read: true });
    res.json({ ok: true });
  });
  route("get", "/api/cockpit/export", (req, res) => {
    res.json({
      workspace: {
        content: store.list("content", req.user.id),
        template: store.list("template", req.user.id),
        schedule: store.list("schedule", req.user.id),
      },
      profile: profile(req.user.id),
      campaigns: store.list("campaign", req.user.id),
      links: store.list("link", req.user.id),
      events: store.events(req.user.id),
      conversions: store.conversions(req.user.id),
    });
  });
  route("delete", "/api/cockpit/account", (req, res) => {
    store.transaction(() => {
      store.db
        .prepare("DELETE FROM events WHERE creator_id=?")
        .run(req.user.id);
      store.db
        .prepare("DELETE FROM conversions WHERE creator_id=?")
        .run(req.user.id);
      store.db
        .prepare("DELETE FROM records WHERE creator_id=?")
        .run(req.user.id);
      for (const s of store.list("swap").filter((s) => s.to_id === req.user.id))
        store.db.prepare("DELETE FROM records WHERE id=?").run(s.id);
      store.db.prepare("DELETE FROM users WHERE id=?").run(req.user.id);
    });
    res.clearCookie("np_session", { path: "/" });
    res.json({ ok: true });
  });
  route("post", "/api/cockpit/development/sample", (req, res) => {
    if (!development) throw error(404, "Not found.");
    const owner = req.user.id;
    if (store.events(owner).some((e) => e.demo))
      throw error(
        409,
        "Sample traffic is already loaded. Clear it before loading again.",
      );
    if (!profile(owner)) throw error(400, "Finish your profile first.");
    store.transaction(() => {
      for (const [source, count, subs] of [
        ["Reddit", 42, 4],
        ["Instagram", 28, 2],
        ["X / Twitter", 16, 1],
      ]) {
        const c = campaign(owner, {
          name: `Sample · ${source}`,
          source,
          destination: profile(owner).destination,
          demo: true,
        });
        for (let i = 0; i < count; i++) {
          const session_id = id();
          const timestamp = new Date(
            Date.now() - (i % 14) * 86400000,
          ).toISOString();
          store.event({
            creator_id: owner,
            campaign_id: c.id,
            tracked_link_id: c.link_id,
            source_id: source,
            session_id,
            type: "tracked_click",
            timestamp,
            device_category: i % 2 ? "mobile" : "desktop",
            country: null,
            referrer: "",
            demo: true,
          });
          if (i < subs) {
            const cv = {
              id: id(),
              creator_id: owner,
              timestamp,
              tracked_link_id: c.link_id,
              campaign_id: c.id,
              source_id: source,
              first_source_id: source,
              session_id,
              revenue: 19,
              verified: true,
              evidence: "development sample",
              demo: true,
            };
            store.db
              .prepare("INSERT INTO conversions VALUES(?,?,?,?,?)")
              .run(cv.id, owner, null, timestamp, JSON.stringify(cv));
          }
        }
      }
      for (const [name, niche, tier] of [
        ["Alex Morgan", "Lifestyle", "1k–10k"],
        ["Jordan Lane", "Fitness", "10k–50k"],
        ["Sam Rivera", "Lifestyle", "Under 1k"],
      ]) {
        const key = `demo-${name.toLowerCase().replaceAll(" ", "-")}`;
        if (!store.get("profile", key))
          store.save("profile", {
            id: key,
            creator_id: key,
            display_name: name,
            niche,
            audience_tier: tier,
            platform: "Subscription platform",
            destination: "https://example.com",
            discovery: true,
            promotion_types: ["Story Swap", "Link Swap"],
            demo: true,
          });
      }
    });
    res.json({ ok: true });
  });
  route("delete", "/api/cockpit/development/sample", (req, res) => {
    if (!development) throw error(404, "Not found.");
    store.transaction(() => {
      for (const r of store
        .list("campaign", req.user.id)
        .filter((r) => r.demo)) {
        store.db.prepare("DELETE FROM records WHERE id=?").run(r.id);
        store.db.prepare("DELETE FROM records WHERE id=?").run(r.link_id);
      }
      for (const e of store.events(req.user.id).filter((e) => e.demo))
        store.db.prepare("DELETE FROM events WHERE id=?").run(e.id);
      for (const c of store.conversions(req.user.id).filter((c) => c.demo))
        store.db.prepare("DELETE FROM conversions WHERE id=?").run(c.id);
      for (const s of store
        .list("swap")
        .filter((s) => s.demo && s.from_id === req.user.id))
        store.db.prepare("DELETE FROM records WHERE id=?").run(s.id);
    });
    res.json({ ok: true });
  });
  route("post", "/api/cockpit/development/swaps/:id/accept", (req, res) => {
    if (!development) throw error(404, "Not found.");
    const s = owned("swap", req.params.id, req.user.id);
    if (!s.demo || s.status !== "pending")
      throw error(400, "Only pending sample swaps can be simulated.");
    store.transaction(() => {
      store.save("swap", { ...s, status: "accepted" });
      for (const [a, b] of [
        [s.from_id, s.to_id],
        [s.to_id, s.from_id],
      ])
        campaign(a, {
          name: `Sample swap · ${profile(b).display_name}`,
          source: "Peer swaps",
          destination: profile(a).destination,
          peer_id: b,
          swap_id: s.id,
          demo: true,
          start_date: s.start_date,
        });
    });
    res.json({ ok: true });
  });
  // Tracked redirects record an anonymous session, then preserve campaign metadata in destination parameters.
  route(
    "get",
    "/go/:creator/:slug",
    (req, res) => {
      limit(req, "tracking", 180);
      const l = store
        .list("link", req.params.creator)
        .find((l) => l.slug === req.params.slug);
      if (!l || l.status !== "active")
        return res.status(404).send("This tracking link is unavailable.");
      if (req.headers.dnt === "1" || req.query.np_no_track === "1") {
        res.setHeader("Referrer-Policy", "no-referrer");
        return res.redirect(302, l.destination);
      }
      const existing = cookie(req).np_visitor;
      const sid =
        existing && /^[a-f0-9-]{36}$/.test(existing) ? existing : id();
      res.cookie("np_visitor", sid, {
        httpOnly: true,
        sameSite: "lax",
        secure: !development,
        maxAge: 30 * 86400000,
        path: "/",
      });
      store.event({
        creator_id: l.creator_id,
        campaign_id: l.campaign_id,
        tracked_link_id: l.id,
        source_id: l.source,
        peer_id: l.peer_id,
        session_id: sid,
        type: "tracked_click",
        device_category: /Mobile|Android|iPhone/i.test(
          req.headers["user-agent"] || "",
        )
          ? "mobile"
          : "desktop",
        country: null,
        referrer: (() => {
          try {
            return new URL(req.headers.referer).origin;
          } catch {
            return "";
          }
        })(),
        demo: l.demo,
      });
      const destination = new URL(l.destination);
      destination.searchParams.set("utm_source", l.source);
      destination.searchParams.set(
        "utm_medium",
        l.peer_id ? "peer" : "campaign",
      );
      destination.searchParams.set("utm_campaign", l.campaign_id);
      destination.searchParams.set("np_link", l.id);
      destination.searchParams.set("np_session", sid);
      res.setHeader("Referrer-Policy", "no-referrer");
      res.redirect(302, destination.href);
    },
    false,
  );
  route(
    "get",
    "/tracking.js",
    (req, res) => {
      res
        .type("application/javascript")
        .send(
          `(()=>{const s=document.currentScript;const token=s.dataset.token;const endpoint=new URL('/api/collect',s.src).href;const params=new URLSearchParams(location.search);const send=(type)=>{if(window.NP_TRACKING_CONSENT!==true||navigator.doNotTrack==='1')return;let sid,link;try{sid=params.get('np_session')||sessionStorage.getItem('np_sid')||crypto.randomUUID();link=params.get('np_link')||sessionStorage.getItem('np_link');sessionStorage.setItem('np_sid',sid);if(link)sessionStorage.setItem('np_link',link);}catch{return;}let referrer='';try{referrer=document.referrer?new URL(document.referrer).origin:'';}catch{}const payload={token,session_id:sid,tracked_link_id:link,path:location.pathname,referrer,device_category:matchMedia('(max-width:700px)').matches?'mobile':'desktop',type};fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});};window.NaughtyPilot={track:send};send('page_view');document.addEventListener('click',e=>{const a=e.target.closest('[data-np-event]');if(a)send(a.dataset.npEvent);});})();`,
        );
    },
    false,
  );
  router.options("/api/collect", (req, res) => {
    const w = store
      .list("website")
      .find((w) => new URL(w.url).origin === req.headers.origin);
    if (w && w.verified) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    res.sendStatus(204);
  });
  router.post(
    "/api/collect",
    express.text({ type: "text/plain", limit: "4kb" }),
    (req, res, next) => {
      try {
        limit(req, "collect", 180);
        const b =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const w = store.list("website").find((w) => w.token === b.token);
        if (!w || !w.verified || req.headers.origin !== new URL(w.url).origin)
          throw error(403, "Website origin is not verified.");
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
        if (
          ![
            "page_view",
            "landing_view",
            "cta_click",
            "subscription_click",
            "custom_event",
          ].includes(b.type)
        )
          throw error(
            400,
            "Unsupported event. Conversions must be recorded by an authorized creator.",
          );
        if (!/^[a-f0-9-]{36}$/.test(b.session_id || ""))
          throw error(400, "Invalid session.");
        const l = b.tracked_link_id
          ? owned("link", b.tracked_link_id, w.creator_id)
          : null;
        store.event({
          creator_id: w.creator_id,
          campaign_id: l?.campaign_id,
          tracked_link_id: l?.id,
          source_id: l?.source || "Direct traffic",
          peer_id: l?.peer_id,
          session_id: b.session_id,
          type: b.type,
          device_category: ["mobile", "desktop", "tablet"].includes(
            b.device_category,
          )
            ? b.device_category
            : "unknown",
          country: null,
          referrer: String(b.referrer || "")
            .split("?")[0]
            .slice(0, 200),
          path: String(b.path || "")
            .split("?")[0]
            .slice(0, 200),
          website_id: w.id,
          demo: false,
        });
        store.save("website", {
          ...w,
          last_event: now(),
          status: "receiving_events",
        });
        res.status(202).json({ ok: true });
      } catch (e) {
        next(e);
      }
    },
  );
  route("get", "/api/cockpit/admin", (req, res) => {
    if (
      !process.env.NP_ADMIN_USER_ID ||
      req.user.id !== process.env.NP_ADMIN_USER_ID
    )
      throw error(403, "Administrator access required.");
    res.json({
      users: store.db.prepare("SELECT id,email,created_at FROM users").all(),
      integrations: store.list("account"),
      events: store.db.prepare("SELECT COUNT(*) AS count FROM events").get()
        .count,
      campaigns: store.list("campaign").length,
      swaps: store.list("swap").length,
      reports: store.list("report"),
      syncFailures: store
        .list("sync")
        .filter((s) => ["unavailable", "failed"].includes(s.status)),
      systemErrors: store.list("system_error"),
      websites: store.list("website").map((w) => ({
        id: w.id,
        creator_id: w.creator_id,
        domain: w.domain,
        status: w.status,
      })),
      health: "running",
    });
  });
  router.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (!err.status)
      store.add("system_error", "system", {
        path: req.path,
        message: "An internal request failed.",
        name: err.name,
      });
    res.status(err.status || 500).json({
      error: err.status ? err.message : "The request could not be processed.",
    });
  });
  return router;
}
