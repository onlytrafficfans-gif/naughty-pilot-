import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalServer } from "../api/_local-dev.mjs";

test("production serves all creator routes, protects sessions, disables samples and survives restart", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "np-production-"));
  const names = [
    "NODE_ENV",
    "PORT",
    "HOST",
    "NP_BASE_URL",
    "RENDER_EXTERNAL_URL",
    "NP_DB_PATH",
    "NP_TRUST_PROXY_HOPS",
  ];
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  Object.assign(process.env, {
    NODE_ENV: "production",
    PORT: "0",
    HOST: "127.0.0.1",
    RENDER_EXTERNAL_URL: "https://naughty-pilot.example",
    NP_DB_PATH: join(directory, "creator.sqlite"),
    NP_TRUST_PROXY_HOPS: "1",
  });
  delete process.env.NP_BASE_URL;
  let running;
  t.after(async () => {
    if (running) await running.close();
    for (const name of names)
      previous[name] === undefined
        ? delete process.env[name]
        : (process.env[name] = previous[name]);
    rmSync(directory, { recursive: true, force: true });
  });
  const start = async () => {
    running = await createLocalServer();
    if (!running.server.listening) await once(running.server, "listening");
    return `http://127.0.0.1:${running.server.address().port}`;
  };
  let base = await start();
  const health = await fetch(base + "/healthz");
  assert.deepEqual(await health.json(), { status: "ok" });
  assert.equal(health.headers.get("cache-control"), "no-store");
  for (const path of [
    "/",
    "/home",
    "/traffic",
    "/campaigns",
    "/peer-swap",
    "/links",
    "/analytics",
    "/account",
    "/admin",
    "/templates",
    "/content-library",
    "/automation",
    "/subscriptions",
    "/settings",
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /<div id="root"><\/div>/);
  }
  assert.equal((await fetch(base + "/api/unknown")).status, 404);
  assert.equal((await fetch(base + "/api/cockpit/state")).status, 401);
  const registration = await fetch(base + "/api/cockpit/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://naughty-pilot.example",
    },
    body: JSON.stringify({
      email: "production-fixture@example.com",
      password: "production-test-password",
      adult: true,
      terms: true,
    }),
  });
  assert.equal(registration.status, 201);
  const session = registration.headers.get("set-cookie");
  assert.match(session, /HttpOnly/);
  assert.match(session, /Secure/);
  assert.match(session, /SameSite=Lax/);
  const cookie = session.split(";")[0];
  assert.equal(
    (
      await fetch(base + "/api/cockpit/development/sample", {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await fetch(base + "/api/cockpit/auth/logout", {
        method: "POST",
        headers: { Cookie: cookie, Origin: "https://foreign.example" },
      })
    ).status,
    403,
  );
  running.store.tokens.save(
    "fixture-patreon",
    (await registration.json()).user.id,
    { access_token: "fixture-only" },
  );
  assert.equal(statSync(process.env.NP_DB_PATH + ".key").mode & 0o777, 0o600);
  await running.close();
  running = null;
  base = await start();
  const identity = await (
    await fetch(base + "/api/cockpit/auth/me", { headers: { Cookie: cookie } })
  ).json();
  assert.equal(identity.user.email, "production-fixture@example.com");
  assert.equal(identity.development, false);
  assert.equal(
    running.store.tokens.get("fixture-patreon", identity.user.id).access_token,
    "fixture-only",
  );
  assert.equal((await fetch(base + "/healthz")).status, 200);
});
