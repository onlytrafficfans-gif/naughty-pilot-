import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const founder = "11111111-1111-4111-8111-111111111111";
const outsider = "22222222-2222-4222-8222-222222222222";
const setup = async () => {
  const db = new PGlite();
  await db.exec(
    `create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role; insert into auth.users values('${founder}'),('${outsider}');`,
  );
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20261010074906_founder_backend.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.query("insert into np_founder(user_id) values($1)", [founder]);
  await db.exec("set role service_role");
  return db;
};
const call = async (db, name, args) =>
  (
    await db.query(
      `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as value`,
      args,
    )
  ).rows[0].value;
const create = async (db) =>
  call(db, "np_create_campaign", [
    founder,
    JSON.stringify({
      name: "Campaign",
      destination: "https://example.com",
      source: "Reddit",
      cost: 0,
    }),
  ]);

test("single founder, RLS and append-only audit; spending cannot be enabled", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  await assert.rejects(
    db.query("insert into np_founder(user_id) values($1)", [outsider]),
    /duplicate key/,
  );
  await assert.rejects(
    call(db, "np_create_campaign", [outsider, "{}"]),
    /FOUNDER_REQUIRED/,
  );
  await assert.rejects(
    db.exec("update np_controls set real_spending_enabled=true"),
    /check constraint/,
  );
  await assert.rejects(db.exec("delete from np_audit"), /permission denied/);
  await assert.rejects(
    db.exec("update np_audit set action='tamper'"),
    /permission denied/,
  );
  await assert.rejects(db.exec("truncate np_audit"), /permission denied/);
  const logs = await db.query("select * from np_audit");
  assert.ok(logs.rows.length >= 1);
  await db.exec("reset role; set role anon");
  await assert.rejects(
    db.exec("select * from np_campaigns"),
    /permission denied/,
  );
  await assert.rejects(
    call(db, "np_pause", [founder, false, "attempt"]),
    /permission denied/,
  );
  await db.exec("reset role; set role authenticated");
  await assert.rejects(
    db.exec("select * from np_records"),
    /permission denied/,
  );
});

test("approval uses explicit revision and budget; edit and pause invalidate approval", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  const c = await create(db);
  await assert.rejects(
    call(db, "np_approve_campaign", [founder, c.id, 1, 1000, 500]),
    /PAUSED/,
  );
  await call(db, "np_pause", [founder, false, "Planning only"]);
  await assert.rejects(
    call(db, "np_approve_campaign", [founder, c.id, 2, 1000, 500]),
    /STALE_REVISION/,
  );
  await assert.rejects(
    call(db, "np_approve_campaign", [founder, c.id, 1, 500, 1000]),
    /INVALID_BUDGET/,
  );
  const approved = await call(db, "np_approve_campaign", [
    founder,
    c.id,
    1,
    1000,
    500,
  ]);
  assert.equal(approved.status, "approved");
  const edited = await call(db, "np_edit_campaign", [
    founder,
    c.id,
    JSON.stringify({ ...c.data, name: "Revised" }),
  ]);
  assert.equal(edited.revision, 2);
  assert.equal(edited.approved_revision, null);
  await assert.rejects(
    call(db, "np_simulate", [founder, c.id, 1, crypto.randomUUID()]),
    /APPROVAL_REQUIRED/,
  );
  await call(db, "np_approve_campaign", [founder, c.id, 2, 1000, 500]);
  await call(db, "np_pause", [founder, true, "Emergency"]);
  await assert.rejects(
    call(db, "np_simulate", [founder, c.id, 1, crypto.randomUUID()]),
    /PAUSED/,
  );
  await call(db, "np_pause", [founder, false, "Resume"]);
  await assert.rejects(
    call(db, "np_simulate", [founder, c.id, 1, crypto.randomUUID()]),
    /APPROVAL_REQUIRED/,
  );
});

test("dry runs enforce daily and total caps atomically; retries cannot double count", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  const c = await create(db);
  await call(db, "np_pause", [founder, false, "Resume"]);
  await call(db, "np_approve_campaign", [founder, c.id, 1, 1000, 500]);
  const key = crypto.randomUUID();
  const a = await call(db, "np_simulate", [founder, c.id, 300, key]);
  assert.equal(a.replayed, false);
  const retry = await call(db, "np_simulate", [founder, c.id, 300, key]);
  assert.equal(retry.replayed, true);
  await assert.rejects(
    call(db, "np_simulate", [founder, c.id, 301, key]),
    /IDEMPOTENCY_CONFLICT/,
  );
  const racing = await Promise.allSettled([
    call(db, "np_simulate", [founder, c.id, 150, crypto.randomUUID()]),
    call(db, "np_simulate", [founder, c.id, 150, crypto.randomUUID()]),
  ]);
  assert.equal(racing.filter((r) => r.status === "fulfilled").length, 1);
  assert.match(
    racing.find((r) => r.status === "rejected").reason.message,
    /CAP_EXCEEDED/,
  );
  assert.equal(
    (
      await db.query("select simulated_cents from np_campaigns where id=$1", [
        c.id,
      ])
    ).rows[0].simulated_cents,
    450,
  );
  await db.exec("update np_simulations set created_at=now()-interval '1 day'");
  await call(db, "np_simulate", [founder, c.id, 500, crypto.randomUUID()]);
  await db.exec("update np_simulations set created_at=now()-interval '1 day'");
  await assert.rejects(
    call(db, "np_simulate", [founder, c.id, 100, crypto.randomUUID()]),
    /CAP_EXCEEDED/,
  );
  await assert.rejects(
    call(db, "np_approve_campaign", [founder, c.id, 1, 500, 400]),
    /INVALID_BUDGET/,
  );
});

test("emergency pause discards in-flight proposals even if planning is resumed", async (t) => {
  const db = await setup();
  t.after(() => db.close());
  await call(db, "np_pause", [founder, false, "Resume"]);
  const run = await call(db, "np_start_agent", [founder, "planner"]);
  await call(db, "np_pause", [founder, true, "Emergency"]);
  await call(db, "np_pause", [founder, false, "Resume"]);
  const done = await call(db, "np_finish_agent", [
    founder,
    run.id,
    JSON.stringify({ summary: "Must not publish" }),
    false,
  ]);
  assert.equal(done.status, "cancelled");
  assert.equal(done.result, null);
  await assert.rejects(
    call(db, "np_start_agent", [outsider, "planner"]),
    /FOUNDER_REQUIRED/,
  );
});
