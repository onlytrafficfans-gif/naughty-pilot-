import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createStore } from "../server/cockpit/store.mjs";
import { createCockpitRouter } from "../server/cockpit/router.mjs";
async function fixture(t) {
  const store = createStore(":memory:");
  const calls = [];
  let failure = null,
    tokenExpires = 3600;
  const response = (data) => new Response(JSON.stringify(data));
  const providerFetch = async (url, options) => {
    calls.push({ url: String(url), options });
    const u = new URL(url);
    if (u.pathname === "/api/oauth2/token")
      return response({
        access_token: "fixture-access",
        refresh_token: "fixture-refresh",
        expires_in: tokenExpires,
      });
    if (failure)
      return new Response("upstream-sensitive-details", { status: failure });
    if (u.pathname === "/api/oauth2/v2/campaigns")
      return response({
        data: [
          {
            id: "123",
            type: "campaign",
            attributes: {
              creation_name: "Studio",
              url: "https://www.patreon.com/studio",
            },
          },
        ],
      });
    assert.equal(u.pathname, "/api/oauth2/v2/campaigns/123/members");
    assert.equal(
      u.searchParams.get("fields[member]"),
      "patron_status,currently_entitled_amount_cents",
    );
    assert.equal(options.headers.Authorization, "Bearer fixture-access");
    const member = (id, patron_status, amount) => ({
      id,
      type: "member",
      attributes: { patron_status, currently_entitled_amount_cents: amount },
    });
    if (u.searchParams.has("page[cursor]"))
      return response({
        data: [
          member("four", "active_patron", 300),
          member("one", "active_patron", 500),
        ],
      });
    return response({
      data: [
        member("one", "active_patron", 500),
        member("two", "active_patron", 0),
        member("three", "declined_patron", 500),
      ],
      links: {
        next: "https://www.patreon.com/api/oauth2/v2/campaigns/123/members?page[cursor]=next",
      },
    });
  };
  const app = express();
  app.use(express.json());
  app.use(
    createCockpitRouter(store, {
      baseUrl: "http://127.0.0.1:4180",
      providerFetch,
      patreonConfig: () => ({
        clientId: "fixture-client",
        clientSecret: "fixture-secret",
      }),
    }),
  );
  const server = await new Promise((r) => {
    const s = app.listen(0, "127.0.0.1", () => r(s));
  });
  t.after(() => {
    server.close();
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const client = () => {
    let cookie = "";
    return {
      async request(path, method = "GET", body) {
        const r = await fetch(base + path, {
          method,
          headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            Cookie: cookie,
          },
          body: body ? JSON.stringify(body) : undefined,
          redirect: "manual",
        });
        const c = r.headers.get("set-cookie");
        if (c) cookie = c.split(";")[0];
        const raw = await r.text();
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
        return { status: r.status, data, headers: r.headers };
      },
    };
  };
  const creator = async (name) => {
    const c = client();
    const reg = await c.request("/api/cockpit/auth/register", "POST", {
      email: name + "@example.com",
      password: "safe-test-password",
      adult: true,
      terms: true,
    });
    assert.equal(reg.status, 201);
    const user = reg.data.user;
    await c.request("/api/cockpit/profile", "PUT", {
      display_name: name,
      niche: "Lifestyle",
      destination: "https://www.patreon.com/studio",
      platform: "Patreon",
      onboarded: true,
    });
    return { ...c, user };
  };
  const connect = async (c) => {
    const start = await c.request(
      "/api/cockpit/oauth/patreon/start",
      "POST",
      {},
    );
    const url = new URL(start.data.authorization_url);
    const r = await c.request(
      `/api/cockpit/oauth/patreon/callback?state=${url.searchParams.get("state")}&code=fixture-code`,
    );
    return { r, state: url.searchParams.get("state"), url };
  };
  return {
    store,
    calls,
    creator,
    connect,
    fail: (value) => {
      failure = value;
    },
    expire: (value) => {
      tokenExpires = value;
    },
  };
}
test("Patreon OAuth sync counts paid members across pages without storing subscriber identities", async (t) => {
  const f = await fixture(t),
    a = await f.creator("patreon-one");
  const { r, state, url } = await f.connect(a);
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "/account?patreon=connected");
  assert.equal(url.hostname, "www.patreon.com");
  assert.match(url.searchParams.get("scope"), /campaigns.members/);
  const data = (await a.request("/api/cockpit/state")).data,
    account = data.accounts.find((a) => a.provider === "Patreon");
  assert.equal(account.status, "connected");
  assert.equal(account.metrics.current_subscribers, 2);
  assert.equal(account.metrics.active_free_members, 1);
  assert.equal(data.subscriber_count.value, 2);
  assert.equal(data.subscriber_count.evidence, "official_api");
  assert.equal(data.metrics.conversions, 0);
  const encrypted = f.store.db
    .prepare("SELECT encrypted FROM provider_tokens")
    .get().encrypted;
  assert.ok(!encrypted.includes("fixture-access"));
  assert.ok(!encrypted.includes("fixture-refresh"));
  const exported = JSON.stringify(
    (await a.request("/api/cockpit/export")).data,
  );
  assert.ok(!exported.includes("fixture-access"));
  assert.ok(!exported.includes("patron_status"));
  assert.ok(!JSON.stringify(data).includes("fixture-secret"));
  assert.equal(
    (
      await a.request(
        `/api/cockpit/oauth/patreon/callback?state=${state}&code=fixture-code`,
      )
    ).status,
    400,
  );
  const tokens = f.store.tokens.get(account.id, a.user.id);
  f.store.tokens.save(account.id, a.user.id, {
    ...tokens,
    expires_at: Date.now() - 1,
  });
  assert.equal(
    (await a.request(`/api/cockpit/accounts/${account.id}/sync`, "POST", {}))
      .status,
    200,
  );
  assert.ok(
    f.calls.some(
      (c) =>
        c.url.endsWith("/token") &&
        new URLSearchParams(c.options.body).get("grant_type") ===
          "refresh_token",
    ),
  );
  await a.request(`/api/cockpit/accounts/${account.id}`, "DELETE");
  assert.equal(f.store.tokens.get(account.id, a.user.id), null);
  assert.equal(
    (await a.request("/api/cockpit/state")).data.subscriber_count.value,
    null,
  );
});
test("OAuth state is session-bound; authorization failures retain previous successful counts", async (t) => {
  const f = await fixture(t),
    a = await f.creator("oauth-owner"),
    b = await f.creator("oauth-intruder");
  const start = await a.request("/api/cockpit/oauth/patreon/start", "POST", {}),
    state = new URL(start.data.authorization_url).searchParams.get("state");
  assert.equal(
    (
      await b.request(
        `/api/cockpit/oauth/patreon/callback?state=${state}&code=fixture-code`,
      )
    ).status,
    400,
  );
  assert.equal(f.calls.length, 0);
  assert.equal(
    (
      await a.request(
        `/api/cockpit/oauth/patreon/callback?state=${state}&code=fixture-code`,
      )
    ).status,
    303,
  );
  const account = (await a.request("/api/cockpit/state")).data.accounts.find(
    (a) => a.provider === "Patreon",
  );
  assert.equal(
    (await b.request(`/api/cockpit/accounts/${account.id}/sync`, "POST", {}))
      .status,
    404,
  );
  f.fail(403);
  const failed = await a.request(
    `/api/cockpit/accounts/${account.id}/sync`,
    "POST",
    {},
  );
  assert.equal(failed.status, 403);
  assert.ok(
    !JSON.stringify(failed.data).includes("upstream-sensitive-details"),
  );
  const current = (await a.request("/api/cockpit/state")).data;
  assert.equal(current.accounts[0].status, "needs_reauthorization");
  assert.equal(current.subscriber_count.value, 2);
  assert.equal(current.subscriber_count.stale, true);
});
test("OnlyFans, Fansly and Pornhub accept public creator URLs and explicitly creator-reported counts", async (t) => {
  const f = await fixture(t),
    a = await f.creator("manual-platforms");
  for (const [provider, url] of [
    ["OnlyFans", "https://onlyfans.com/studio"],
    ["Fansly", "https://fansly.com/studio"],
    ["Pornhub", "https://www.pornhub.com/model/studio"],
  ]) {
    assert.equal(
      (
        await a.request("/api/cockpit/accounts", "POST", {
          provider,
          url: "https://attacker.example",
          manual_subscribers: 100,
        })
      ).status,
      400,
    );
    const added = await a.request("/api/cockpit/accounts", "POST", {
      provider,
      url,
      manual_subscribers: 12,
    });
    assert.equal(added.status, 200);
    assert.equal(added.data.status, "url_only");
    await a.request("/api/cockpit/profile", "PUT", {
      display_name: "Studio",
      niche: "Lifestyle",
      platform: provider,
      destination: url,
      onboarded: true,
    });
    const data = (await a.request("/api/cockpit/state")).data;
    assert.equal(data.subscriber_count.value, 12);
    assert.equal(data.subscriber_count.evidence, "creator_reported");
    assert.equal(data.metrics.conversions, 0);
  }
  assert.equal(
    (await a.request("/api/cockpit/accounts", "POST", { provider: "Patreon" }))
      .status,
    400,
  );
  assert.equal(
    (
      await a.request("/api/cockpit/accounts", "POST", {
        provider: "OnlyFans",
        url: "https://onlyfans.com/studio",
        manual_subscribers: -1,
      })
    ).status,
    400,
  );
});
