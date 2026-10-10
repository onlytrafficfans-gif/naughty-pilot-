import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHmac } from "node:crypto";
import express from "express";
import { createFounderRouter } from "../server/founder/router.mjs";
import { testBackend, founderId } from "./support/founder-backend.mjs";
import { webhookValid, cents, revenue } from "../server/founder/validation.mjs";
import { configuration } from "../server/founder/supabase.mjs";

test("API contract: founder access, durable workspace, approval, pause, tracking, signed conversions and agents", async (t) => {
  const backend = await testBackend();
  const app = express();
  app.use(
    express.json({
      verify: (req, _res, body) => (req.rawBody = Buffer.from(body)),
    }),
  );
  app.use(
    createFounderRouter({
      config: { origin: "https://founder.example", adminId: founderId },
      backend,
      generate: async () => ({
        summary: "Fixture proposal",
        recommendations: ["Review campaign"],
        copy: [],
        risks: ["Spending disabled"],
      }),
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await backend.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (
    path,
    {
      method = "GET",
      body,
      cookie = "np_access=fixture-founder",
      headers = {},
    } = {},
  ) => {
    const r = await fetch(base + path, {
      method,
      redirect: "manual",
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const raw = await r.text();
    return {
      status: r.status,
      body: raw ? JSON.parse(raw) : null,
      headers: r.headers,
    };
  };
  assert.equal((await call("/api/health", { cookie: "" })).status, 200);
  assert.equal((await call("/api/cockpit/state", { cookie: "" })).status, 401);
  assert.equal(
    (await call("/api/cockpit/state", { cookie: "np_access=fixture-outsider" }))
      .status,
    403,
  );
  assert.equal(
    (
      await call("/api/cockpit/auth/register", {
        method: "POST",
        body: {},
        cookie: "",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("/api/cockpit/controls/resume", {
        method: "POST",
        body: {},
        headers: { Origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  const login = await call("/api/cockpit/auth/login", {
    method: "POST",
    cookie: "",
    body: { email: "founder@example.com", password: "fixture-password" },
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie"), /HttpOnly/);
  assert.match(login.headers.get("set-cookie"), /Secure/);
  assert.match(login.headers.get("set-cookie"), /SameSite=Strict/);
  await call("/api/cockpit/profile", {
    method: "PUT",
    body: {
      display_name: "Founder",
      destination: "https://example.com/founder",
      platform: "OnlyFans",
      onboarded: true,
    },
  });
  const content = await call("/api/cockpit/workspace/content", {
    method: "POST",
    body: {
      title: "Saved content",
      source: "Reddit",
      url: "https://example.com/content",
    },
  });
  assert.equal(content.status, 201);
  assert.equal(
    (await call("/api/cockpit/workspace/content")).body.items[0].title,
    "Saved content",
  );
  const created = await call("/api/cockpit/campaigns", {
    method: "POST",
    body: {
      name: "Founder test",
      source: "Reddit",
      destination: "https://example.com/founder",
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "draft");
  const campaign = created.body;
  assert.equal(
    (
      await call(`/api/cockpit/campaigns/${campaign.id}/approve`, {
        method: "POST",
        body: { revision: 1, budget_cents: 1000, daily_cap_cents: 500 },
      })
    ).status,
    423,
  );
  await call("/api/cockpit/controls/resume", { method: "POST", body: {} });
  assert.equal(
    (
      await call(`/api/cockpit/campaigns/${campaign.id}/approve`, {
        method: "POST",
        body: { revision: 1, budget_cents: 1000, daily_cap_cents: 500 },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(`/api/cockpit/campaigns/${campaign.id}/execute`, {
        method: "POST",
        body: {},
      })
    ).body.code,
    "SPENDING_DISABLED",
  );
  const key = crypto.randomUUID();
  const simulated = await call(
    `/api/cockpit/campaigns/${campaign.id}/simulate`,
    { method: "POST", body: { amount_cents: 400, request_id: key } },
  );
  assert.equal(simulated.status, 200);
  assert.equal(
    (
      await call(`/api/cockpit/campaigns/${campaign.id}/simulate`, {
        method: "POST",
        body: { amount_cents: 400, request_id: key },
      })
    ).body.replayed,
    true,
  );
  assert.equal(
    (
      await call(`/api/cockpit/campaigns/${campaign.id}/simulate`, {
        method: "POST",
        body: { amount_cents: 101, request_id: crypto.randomUUID() },
      })
    ).status,
    409,
  );
  const state = (await call("/api/cockpit/state")).body;
  assert.equal(state.links.length, 1);
  assert.equal(state.metrics.visitors, 0);
  const tracked = await fetch(base + new URL(state.links[0].url).pathname, {
    redirect: "manual",
  });
  assert.equal(tracked.status, 302);
  const target = new URL(tracked.headers.get("location"));
  assert.equal(target.searchParams.get("np_link"), campaign.link_id);
  const manual = {
    external_id: "manual-1",
    tracked_link_id: campaign.link_id,
    revenue: 19,
    session_id: target.searchParams.get("np_session"),
  };
  assert.equal(
    (await call("/api/cockpit/conversions", { method: "POST", body: manual }))
      .body.verified,
    false,
  );
  assert.equal(
    (await call("/api/cockpit/conversions", { method: "POST", body: manual }))
      .status,
    409,
  );
  const secretBefore = process.env.NP_CONVERSION_WEBHOOK_SECRET;
  process.env.NP_CONVERSION_WEBHOOK_SECRET =
    "fixture-secret-only-at-least-32-bytes";
  t.after(() => {
    secretBefore === undefined
      ? delete process.env.NP_CONVERSION_WEBHOOK_SECRET
      : (process.env.NP_CONVERSION_WEBHOOK_SECRET = secretBefore);
  });
  const signed = { ...manual, external_id: "verified-1" };
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac(
    "sha256",
    process.env.NP_CONVERSION_WEBHOOK_SECRET,
  )
    .update(timestamp + "." + JSON.stringify(signed))
    .digest("hex");
  const headers = { "x-np-timestamp": timestamp, "x-np-signature": signature };
  assert.equal(
    (
      await call("/api/conversions/webhook", {
        method: "POST",
        cookie: "",
        body: signed,
        headers,
      })
    ).body.verified,
    true,
  );
  assert.equal(
    (
      await call("/api/conversions/webhook", {
        method: "POST",
        cookie: "",
        body: signed,
        headers,
      })
    ).status,
    409,
  );
  const measuredResponse = await call("/api/cockpit/state");
  assert.equal(
    measuredResponse.status,
    200,
    JSON.stringify(measuredResponse.body),
  );
  const measured = measuredResponse.body;
  assert.equal(measured.metrics.visitors, 1);
  assert.equal(measured.metrics.conversions, 1);
  assert.equal(measured.metrics.unverified, 1);
  assert.equal(measured.metrics.revenue, 19);
  const agent = await call("/api/cockpit/agents/run", {
    method: "POST",
    body: { agent: "planner", brief: "Plan a campaign" },
  });
  assert.equal(agent.status, 200);
  assert.equal(agent.body.run.status, "completed");
  await call("/api/cockpit/controls/pause", {
    method: "POST",
    body: { reason: "Emergency" },
  });
  assert.equal(
    (
      await call("/api/cockpit/agents/run", {
        method: "POST",
        body: { agent: "planner", brief: "Plan" },
      })
    ).status,
    423,
  );
  const admin = (await call("/api/cockpit/admin")).body;
  assert.equal(admin.users.length, 1);
  assert.equal(admin.controls.paused, true);
  assert.equal(admin.controls.real_spending_enabled, false);
  assert.ok(admin.audit.some((a) => a.action === "spending.blocked"));
  assert.equal((await call("/api/cockpit/no-such-route")).status, 404);
  assert.equal(
    (await call("/api/cockpit/auth/logout", { method: "POST", body: {} }))
      .status,
    200,
  );
  assert.equal((await call("/api/cockpit/state")).status, 401);
});

test("validation rejects forged webhook signatures, stale requests and fractional budgets", () => {
  const body = Buffer.from("{}"),
    timestamp = String(Math.floor(Date.now() / 1000)),
    secret = "test-only";
  const signature = createHmac("sha256", secret)
    .update(timestamp + ".")
    .update(body)
    .digest("hex");
  assert.equal(webhookValid(body, timestamp, signature, secret), true);
  assert.equal(
    webhookValid(Buffer.from('{"revenue":1}'), timestamp, signature, secret),
    false,
  );
  assert.equal(
    webhookValid(body, timestamp, signature, secret, Date.now() + 600000),
    false,
  );
  assert.equal(webhookValid(body, timestamp, "x".repeat(64), secret), false);
  assert.throws(() => cents(1.1, "Budget"));
  assert.throws(() => cents("100", "Budget"));
  assert.throws(() => revenue(-1));
  assert.throws(() => revenue(1.001));
  assert.throws(() => configuration({}), /Backend setup required/);
});
