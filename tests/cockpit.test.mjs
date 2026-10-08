import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../api/cockpit/store.mjs";
import { createCockpitRouter } from "../api/cockpit/router.mjs";
import { aggregate } from "../api/cockpit/metrics.mjs";
async function fixture(t, { development = true } = {}) {
  const store = createStore(":memory:");
  const app = express();
  app.use(express.json({ limit: "16kb" }));
  app.use(
    createCockpitRouter(store, {
      development,
      baseUrl: "http://127.0.0.1:4180",
    }),
  );
  const server = await new Promise((r) => {
    const s = app.listen(0, "127.0.0.1", () => r(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    server.close();
    store.close();
  });
  const client = () => {
    let cookie = "";
    return {
      async request(path, method = "GET", body, headers = {}) {
        const r = await fetch(base + path, {
          method,
          headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...headers,
            ...(cookie ? { Cookie: cookie } : {}),
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
  const creator = async (email) => {
    const c = client();
    const r = await c.request("/api/cockpit/auth/register", "POST", {
      email,
      password: "long-test-password",
      adult: true,
      terms: true,
    });
    assert.equal(r.status, 201);
    const user = r.data.user;
    const p = await c.request("/api/cockpit/profile", "PUT", {
      display_name: email.split("@")[0],
      niche: "Lifestyle",
      platform: "Example subscription",
      destination: "https://example.com/creator",
      discovery: true,
      onboarded: true,
      audience_tier: "1k–10k",
      promotion_types: ["Link Swap"],
    });
    assert.equal(p.status, 200);
    return { ...c, user };
  };
  return { store, client, creator, base };
}
test("authentication, adulthood, origin checks, login, ownership, logout and admin separation", async (t) => {
  const f = await fixture(t),
    anon = f.client();
  assert.equal((await anon.request("/api/cockpit/state")).status, 401);
  assert.equal(
    (
      await anon.request("/api/cockpit/auth/register", "POST", {
        email: "minor@example.com",
        password: "long-password",
        adult: false,
        terms: true,
      })
    ).status,
    400,
  );
  const a = await f.creator("alpha@example.com"),
    b = await f.creator("beta@example.com");
  const campaign = (
    await a.request("/api/cockpit/campaigns", "POST", {
      name: "Launch",
      source: "Reddit",
      destination: "https://example.com",
      start_date: "2026-10-01",
    })
  ).data;
  assert.equal(
    (
      await b.request(`/api/cockpit/links/${campaign.link_id}`, "PATCH", {
        status: "paused",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await a.request(
        "/api/cockpit/campaigns",
        "POST",
        { name: "Bad", destination: "javascript:alert(1)" },
        { Origin: "https://attacker.example" },
      )
    ).status,
    403,
  );
  assert.equal((await a.request("/api/cockpit/admin")).status, 403);
  assert.equal(
    (await a.request("/api/cockpit/state")).data.metrics.visitors,
    0,
  );
  await a.request("/api/cockpit/auth/logout", "POST", {});
  assert.equal((await a.request("/api/cockpit/state")).status, 401);
  assert.equal(
    (
      await a.request("/api/cockpit/auth/login", "POST", {
        email: "alpha@example.com",
        password: "wrong",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await a.request("/api/cockpit/auth/login", "POST", {
        email: "alpha@example.com",
        password: "long-test-password",
      })
    ).status,
    200,
  );
});
test("tracked links preserve UTM attribution, session uniqueness, pause state and conversion evidence", async (t) => {
  const f = await fixture(t),
    a = await f.creator("links@example.com");
  const campaign = (
    await a.request("/api/cockpit/campaigns", "POST", {
      name: "Reddit launch",
      source: "Reddit",
      destination: "https://example.com/join?keep=yes",
      cost: 10,
    })
  ).data;
  let state = (await a.request("/api/cockpit/state")).data;
  const l = state.links[0];
  const visitor = f.client();
  const click = await visitor.request(new URL(l.url).pathname);
  assert.equal(click.status, 302);
  const dest = new URL(click.headers.get("location"));
  assert.equal(dest.searchParams.get("keep"), "yes");
  assert.equal(dest.searchParams.get("utm_source"), "Reddit");
  assert.equal(dest.searchParams.get("np_link"), l.id);
  await visitor.request(new URL(l.url).pathname);
  const conversion = await a.request("/api/cockpit/conversions", "POST", {
    tracked_link_id: l.id,
    session_id: dest.searchParams.get("np_session"),
    revenue: 19,
    external_id: "receipt-one",
  });
  assert.equal(conversion.status, 201);
  assert.equal(conversion.data.evidence, "creator-provided");
  assert.equal(
    (
      await a.request("/api/cockpit/conversions", "POST", {
        tracked_link_id: l.id,
        revenue: 19,
        external_id: "receipt-one",
      })
    ).status,
    409,
  );
  await a.request("/api/cockpit/conversions", "POST", { revenue: 50 });
  state = (await a.request("/api/cockpit/state")).data;
  assert.equal(state.metrics.visitors, 1);
  assert.equal(state.metrics.clicks, 2);
  assert.equal(state.metrics.conversions, 1);
  assert.equal(state.metrics.unverified, 1);
  assert.equal(state.metrics.revenue, 19);
  assert.equal(state.campaigns[0].roi, 90);
  await a.request(`/api/cockpit/links/${l.id}`, "PATCH", { status: "paused" });
  assert.equal((await visitor.request(new URL(l.url).pathname)).status, 404);
  assert.equal(
    (
      await a.request("/api/cockpit/campaigns", "POST", {
        name: "Bad dates",
        destination: "https://example.com",
        start_date: "2026-10-10",
        end_date: "2026-10-01",
      })
    ).status,
    400,
  );
});
test("website ownership diagnostics and consent-limited collector reject forged conversions", async (t) => {
  const f = await fixture(t),
    a = await f.creator("website@example.com");
  const w = (
    await a.request("/api/cockpit/websites", "POST", {
      url: "https://creator.example",
    })
  ).data;
  assert.equal(
    (await a.request(`/api/cockpit/websites/${w.id}/test`, "POST", {})).data
      .installed,
    false,
  );
  const anonymous = f.client();
  const event = {
    token: w.token,
    type: "page_view",
    session_id: crypto.randomUUID(),
  };
  assert.equal(
    (
      await anonymous.request("/api/collect", "POST", event, {
        Origin: "https://creator.example",
      })
    ).status,
    403,
  );
  f.store.save("website", { ...w, verified: true });
  assert.equal(
    (
      await anonymous.request("/api/collect", "POST", event, {
        Origin: "https://wrong.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await anonymous.request(
        "/api/collect",
        "POST",
        { ...event, type: "campaign_conversion" },
        { Origin: "https://creator.example" },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await anonymous.request("/api/collect", "POST", event, {
        Origin: "https://creator.example",
      })
    ).status,
    202,
  );
  assert.equal(
    (await a.request(`/api/cockpit/websites/${w.id}/test`, "POST", {})).data
      .installed,
    true,
  );
  const state = (await a.request("/api/cockpit/state")).data;
  assert.equal(state.metrics.visits, 1);
  assert.equal(state.events[0].country, null);
  const script = (await anonymous.request("/tracking.js")).data;
  assert.match(script, /NP_TRACKING_CONSENT/);
  assert.match(script, /doNotTrack/);
});
test("peer consent, request/counter/accept, bilateral links, swap attribution and completion", async (t) => {
  const f = await fixture(t),
    a = await f.creator("alice@example.com"),
    b = await f.creator("bob@example.com"),
    third = await f.creator("third@example.com");
  let s = (
    await a.request("/api/cockpit/swaps", "POST", {
      peer_id: b.user.id,
      type: "Link Swap",
      platform: "Instagram",
      duration: 7,
      start_date: "2026-10-10",
    })
  ).data;
  assert.equal(
    (
      await third.request(`/api/cockpit/swaps/${s.id}/respond`, "POST", {
        action: "accept",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await a.request(`/api/cockpit/swaps/${s.id}/respond`, "POST", {
        action: "accept",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await b.request(`/api/cockpit/swaps/${s.id}/respond`, "POST", {
        action: "counter",
        duration: 5,
        start_date: "2026-10-12",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await a.request(`/api/cockpit/swaps/${s.id}/respond`, "POST", {
        action: "accept",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await a.request(`/api/cockpit/swaps/${s.id}/respond`, "POST", {
        action: "accept",
      })
    ).status,
    403,
  );
  let sa = (await a.request("/api/cockpit/state")).data,
    sb = (await b.request("/api/cockpit/state")).data;
  assert.equal(sa.links.length, 1);
  assert.equal(sb.links.length, 1);
  assert.equal(sa.swaps[0].share_url, sb.links[0].url);
  const visitor = f.client();
  const click = await visitor.request(new URL(sa.swaps[0].share_url).pathname);
  const dest = new URL(click.headers.get("location"));
  await b.request("/api/cockpit/conversions", "POST", {
    tracked_link_id: sb.links[0].id,
    session_id: dest.searchParams.get("np_session"),
    revenue: 25,
  });
  sa = (await a.request("/api/cockpit/state")).data;
  sb = (await b.request("/api/cockpit/state")).data;
  assert.equal(sa.swaps[0].sent.visitors, 1);
  assert.equal(sa.swaps[0].sent.conversions, 1);
  assert.equal(sa.swaps[0].received.conversions, 0);
  assert.equal(sb.metrics.peerSubscribers, 1);
  assert.equal(sa.swaps[0].fairness, "Needs review");
  assert.equal(
    (
      await b.request(`/api/cockpit/swaps/${s.id}/respond`, "POST", {
        action: "complete",
      })
    ).status,
    200,
  );
  await a.request(`/api/cockpit/peers/${b.user.id}/block`, "POST", {});
  assert.ok(
    !(await a.request("/api/cockpit/state")).data.peers.some(
      (p) => p.creator_id === b.user.id,
    ),
  );
  assert.equal(
    (
      await b.request("/api/cockpit/swaps", "POST", {
        peer_id: a.user.id,
        type: "Link Swap",
        platform: "Instagram",
        duration: 7,
        start_date: "2026-10-10",
      })
    ).status,
    403,
  );
});
test("integration failures remain honest, sample mode is labeled and isolated, export/delete work", async (t) => {
  const f = await fixture(t),
    a = await f.creator("sample@example.com");
  const connection = (
    await a.request("/api/cockpit/accounts", "POST", { provider: "Instagram" })
  ).data;
  assert.equal(connection.status, "unavailable");
  assert.equal(
    (await a.request(`/api/cockpit/accounts/${connection.id}/sync`, "POST", {}))
      .data.status,
    "unavailable",
  );
  assert.equal(
    (await a.request("/api/cockpit/development/sample", "POST", {})).status,
    200,
  );
  let state = (await a.request("/api/cockpit/state")).data;
  assert.equal(state.has_demo, true);
  assert.equal(state.metrics.visitors, 86);
  assert.equal(state.metrics.conversions, 7);
  assert.equal(state.metrics.revenue, 133);
  assert.ok(state.peers.every((p) => p.demo));
  await a.request("/api/cockpit/development/sample", "DELETE");
  state = (await a.request("/api/cockpit/state")).data;
  assert.equal(state.has_demo, false);
  assert.equal(state.metrics.visitors, 0);
  assert.equal(state.links.length, 0);
  assert.ok((await a.request("/api/cockpit/export")).data.profile);
  await a.request("/api/cockpit/account", "DELETE");
  assert.equal((await a.request("/api/cockpit/auth/me")).data.user, null);
  const prod = await fixture(t, { development: false }),
    c = await prod.creator("prod@example.com");
  assert.equal(
    (await c.request("/api/cockpit/development/sample", "POST", {})).status,
    404,
  );
});
test("first-touch and last-touch credit real session history; database persists across restart", () => {
  const c = {
    verified: true,
    tracked_link_id: "l",
    timestamp: new Date().toISOString(),
    source_id: "Instagram",
    first_source_id: "Reddit",
    revenue: 10,
  };
  assert.equal(
    aggregate([], [c], { model: "first-touch" }).rows[0].source,
    "Reddit",
  );
  assert.equal(aggregate([], [c]).rows[0].source, "Instagram");
  const dir = mkdtempSync(join(tmpdir(), "np-store-"));
  const file = join(dir, "test.sqlite");
  let s = createStore(file);
  s.add("profile", "creator", { display_name: "Persistent" });
  s.close();
  s = createStore(file);
  assert.equal(s.list("profile", "creator")[0].display_name, "Persistent");
  s.close();
  rmSync(dir, { recursive: true, force: true });
});

test("real session history credits first and last campaigns correctly and respects Do Not Track", async (t) => {
  const f = await fixture(t),
    a = await f.creator("touches@example.com");
  const make = async (source) =>
    (
      await a.request("/api/cockpit/campaigns", "POST", {
        name: source,
        source,
        destination: "https://example.com",
      })
    ).data;
  const reddit = await make("Reddit"),
    instagram = await make("Instagram");
  const state = (await a.request("/api/cockpit/state")).data;
  const rl = state.links.find((l) => l.campaign_id === reddit.id),
    il = state.links.find((l) => l.campaign_id === instagram.id);
  const visitor = f.client();
  const noTrack = await visitor.request(
    new URL(rl.url).pathname,
    "GET",
    undefined,
    { DNT: "1" },
  );
  assert.equal(noTrack.status, 302);
  assert.equal(noTrack.headers.get("set-cookie"), null);
  assert.equal(f.store.events(a.user.id).length, 0);
  const first = await visitor.request(new URL(rl.url).pathname);
  const session_id = new URL(first.headers.get("location")).searchParams.get(
    "np_session",
  );
  await visitor.request(new URL(il.url).pathname);
  await a.request("/api/cockpit/conversions", "POST", {
    session_id,
    revenue: 12,
  });
  const last = (await a.request("/api/cockpit/state?model=last-touch")).data;
  const firstState = (await a.request("/api/cockpit/state?model=first-touch"))
    .data;
  assert.equal(
    last.campaigns.find((c) => c.id === instagram.id).metrics.conversions,
    1,
  );
  assert.equal(
    firstState.campaigns.find((c) => c.id === reddit.id).metrics.conversions,
    1,
  );
  assert.equal(
    firstState.campaigns.find((c) => c.id === instagram.id).metrics.conversions,
    0,
  );
  assert.equal(
    firstState.metrics.rows.find((r) => r.source === "Reddit").subscribers,
    1,
  );
  const oldAdmin = process.env.NP_ADMIN_USER_ID;
  process.env.NP_ADMIN_USER_ID = a.user.id;
  try {
    const admin = await a.request("/api/cockpit/admin");
    assert.equal(admin.status, 200);
    assert.equal(admin.data.events, 2);
  } finally {
    if (oldAdmin === undefined) delete process.env.NP_ADMIN_USER_ID;
    else process.env.NP_ADMIN_USER_ID = oldAdmin;
  }
});

test("content, templates and schedules persist with creator ownership and deduplicated due reminders", async (t) => {
  const f = await fixture(t),
    a = await f.creator("workspace-a@example.com"),
    b = await f.creator("workspace-b@example.com");
  for (const kind of ["content", "template", "schedule"]) {
    const data = {
      title: kind + " fixture",
      source: "Reddit",
      url: "https://example.com/content",
      caption: "Creator-owned caption",
      ...(kind === "schedule"
        ? {
            due_at: new Date(Date.now() - 60000).toISOString(),
            status: "pending",
          }
        : {}),
    };
    const created = await a.request(
      "/api/cockpit/workspace/" + kind,
      "POST",
      data,
    );
    assert.equal(created.status, 201);
    const item = created.data.item;
    assert.equal(
      (
        await b.request(
          `/api/cockpit/workspace/${kind}/${item.id}`,
          "PUT",
          data,
        )
      ).status,
      404,
    );
    assert.equal(
      (await b.request(`/api/cockpit/workspace/${kind}/${item.id}`, "DELETE"))
        .status,
      404,
    );
    assert.equal(
      (await b.request("/api/cockpit/workspace/" + kind)).data.items.length,
      0,
    );
    const read = await a.request("/api/cockpit/workspace/" + kind);
    assert.equal(read.data.items[0].title, data.title);
    const updated = await a.request(
      `/api/cockpit/workspace/${kind}/${item.id}`,
      "PUT",
      { ...data, title: "Updated " + kind },
    );
    assert.equal(updated.status, 200);
    if (kind === "schedule") {
      const first = (await a.request("/api/cockpit/state")).data;
      assert.equal(
        first.notifications.filter((n) => n.key?.startsWith("schedule-"))
          .length,
        1,
      );
      assert.equal(
        (await a.request("/api/cockpit/state")).data.notifications.filter((n) =>
          n.key?.startsWith("schedule-"),
        ).length,
        1,
      );
      assert.equal(
        (
          await a.request(`/api/cockpit/workspace/${kind}/${item.id}`, "PUT", {
            ...data,
            status: "completed",
          })
        ).status,
        200,
      );
    }
    assert.equal(
      (await a.request("/api/cockpit/export")).data.workspace[kind].length,
      1,
    );
    assert.equal(
      (await a.request(`/api/cockpit/workspace/${kind}/${item.id}`, "DELETE"))
        .status,
      200,
    );
  }
  assert.equal(
    (
      await a.request("/api/cockpit/workspace/content", "POST", {
        title: "Bad URL",
        url: "javascript:alert(1)",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await a.request("/api/cockpit/workspace/schedule", "POST", {
        title: "Bad date",
        due_at: "invalid",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await a.request("/api/cockpit/workspace/content", "POST", {
        title: "Bad source",
        url: "https://example.com",
        source: "unknown",
      })
    ).status,
    400,
  );
});
