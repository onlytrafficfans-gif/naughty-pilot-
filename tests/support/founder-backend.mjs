// Test-only Supabase query adapter backed by real PostgreSQL (PGlite).
// Authentication is a deterministic fixture; no claim of live Supabase Auth.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
export const founderId = "11111111-1111-4111-8111-111111111111";
export const outsiderId = "22222222-2222-4222-8222-222222222222";
export async function testBackend() {
  const pg = new PGlite();
  await pg.exec(
    `create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;insert into auth.users values('${founderId}'),('${outsiderId}');`,
  );
  await pg.exec(
    readFileSync(
      new URL(
        "../../supabase/migrations/20261010074906_founder_backend.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await pg.query("insert into np_founder(user_id) values($1)", [founderId]);
  await pg.exec("set role service_role");
  const user = (id) => ({
    id,
    email: id === founderId ? "founder@example.com" : "other@example.com",
  });
  const auth = () => ({
    auth: {
      getUser: async (token) =>
        token === "fixture-founder"
          ? { data: { user: user(founderId) }, error: null }
          : token === "fixture-outsider"
            ? { data: { user: user(outsiderId) }, error: null }
            : { error: { message: "Invalid session" } },
      signInWithPassword: async ({ email, password }) =>
        password === "fixture-password"
          ? {
              data: {
                user: user(
                  email === "founder@example.com" ? founderId : outsiderId,
                ),
                session: {
                  access_token:
                    email === "founder@example.com"
                      ? "fixture-founder"
                      : "fixture-outsider",
                  refresh_token: "fixture-refresh",
                  expires_in: 3600,
                },
              },
              error: null,
            }
          : { error: { message: "Invalid credentials" } },
      refreshSession: async () => ({ error: { message: "Expired fixture" } }),
    },
  });
  const db = {
    auth: { admin: { signOut: async () => ({ error: null }) } },
    rpc: async (name, args) => {
      if (!/^np_[a-z_]+$/.test(name))
        throw new Error("Unsafe fixture function");
      try {
        const data = (
          await pg.query(
            `select public.${name}(${Object.values(args)
              .map((_, i) => "$" + (i + 1))
              .join(",")}) as value`,
            Object.values(args),
          )
        ).rows[0].value;
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    from: (table) => {
      if (!/^np_[a-z_]+$/.test(table)) throw new Error("Unsafe fixture table");
      let action = "select",
        body,
        columns = "*",
        filters = [],
        sort,
        cap,
        offset = 0,
        single = false,
        maybe = false,
        opts = {};
      const q = {
        select: (value = "*", options = {}) => {
          columns = value;
          opts = options;
          return q;
        },
        eq: (key, value) => {
          filters.push([key, value]);
          return q;
        },
        insert: (value) => {
          action = "insert";
          body = value;
          return q;
        },
        upsert: (value) => {
          action = "upsert";
          body = value;
          return q;
        },
        update: (value) => {
          action = "update";
          body = value;
          return q;
        },
        delete: () => {
          action = "delete";
          return q;
        },
        order: (key, { ascending = true } = {}) => {
          sort = `${key} ${ascending ? "asc" : "desc"}`;
          return q;
        },
        limit: (value) => {
          cap = value;
          return q;
        },
        range: (from, to) => {
          offset = from;
          cap = to - from + 1;
          return q;
        },
        single: () => {
          single = true;
          return q;
        },
        maybeSingle: () => {
          single = true;
          maybe = true;
          return q;
        },
        then: (resolve, reject) => execute().then(resolve, reject),
      };
      async function execute() {
        try {
          const args = [],
            param = (value) => {
              args.push(value);
              return "$" + args.length;
            };
          const where = () =>
            filters.length
              ? " where " +
                filters.map(([key, v]) => `${key}=${param(v)}`).join(" and ")
              : "";
          let sql;
          if (action === "select")
            sql = `select ${opts.count ? "count(*)" : columns} from ${table}${where()}${sort ? " order by " + sort : ""}${cap ? " limit " + cap : ""}${offset ? " offset " + offset : ""}`;
          else if (["insert", "upsert"].includes(action)) {
            const keys = Object.keys(body);
            sql = `insert into ${table}(${keys.join(",")}) values(${keys.map((k) => param(body[k])).join(",")})`;
            if (action === "upsert")
              sql += ` on conflict(${table === "np_revoked_tokens" ? "digest" : "id"}) do update set ${keys.map((k) => `${k}=excluded.${k}`).join(",")}`;
            sql += " returning *";
          } else if (action === "update")
            sql = `update ${table} set ${Object.keys(body)
              .map((k) => `${k}=${param(body[k])}`)
              .join(",")}${where()} returning *`;
          else sql = `delete from ${table}${where()} returning *`;
          // PostgREST JSON serializes PostgreSQL timestamps; PGlite returns Date objects.
          const rows = JSON.parse(
            JSON.stringify((await pg.query(sql, args)).rows),
          );
          if (opts.count)
            return { data: null, count: Number(rows[0].count), error: null };
          if (single && rows.length !== 1 && !maybe)
            return { error: { message: "Expected a row" } };
          return { data: single ? rows[0] || null : rows, error: null };
        } catch (error) {
          return { data: null, error };
        }
      }
      return q;
    },
  };
  return { db, auth, pg, close: () => pg.close() };
}
