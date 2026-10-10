import { createClient } from "@supabase/supabase-js";

export const fault = (status, code, message) =>
  Object.assign(new Error(message), { status, code });
export function configuration(env = process.env) {
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NP_ADMIN_USER_ID",
    "NP_BASE_URL",
  ];
  const missing = keys.filter((key) => !env[key]);
  if (missing.length)
    throw fault(
      503,
      "BACKEND_NOT_CONFIGURED",
      `Backend setup required: ${missing.join(", ")}.`,
    );
  const base = new URL(env.NP_BASE_URL);
  const db = new URL(env.SUPABASE_URL);
  if (base.protocol !== "https:" || db.protocol !== "https:")
    throw fault(
      503,
      "INVALID_CONFIGURATION",
      "Production URLs must use HTTPS.",
    );
  return {
    url: db.origin,
    publicKey: env.SUPABASE_ANON_KEY,
    secret: env.SUPABASE_SERVICE_ROLE_KEY,
    adminId: env.NP_ADMIN_USER_ID,
    origin: base.origin,
  };
}
export function clients(config) {
  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (url, options) =>
        fetch(url, { ...options, signal: AbortSignal.timeout(15000) }),
    },
  };
  return {
    db: createClient(config.url, config.secret, options),
    // Each login gets a fresh public client; no shared mutable auth session on the privileged client.
    auth: () => createClient(config.url, config.publicKey, options),
  };
}
const rpcStatuses = {
  FOUNDER_REQUIRED: 403,
  NOT_FOUND: 404,
  PAUSED: 423,
  STALE_REVISION: 409,
  INVALID_BUDGET: 400,
  INVALID_AMOUNT: 400,
  IDEMPOTENCY_CONFLICT: 409,
  APPROVAL_REQUIRED: 409,
  CAP_EXCEEDED: 409,
  RATE_LIMITED: 429,
};
export async function result(query) {
  const { data, error } = await query;
  if (!error) return data;
  const code = Object.keys(rpcStatuses).find((code) =>
    error.message?.includes(code),
  );
  if (code)
    throw fault(
      rpcStatuses[code],
      code,
      code.replaceAll("_", " ").toLowerCase(),
    );
  if (error.code === "23505")
    throw fault(409, "DUPLICATE_REFERENCE", "This reference already exists.");
  throw fault(
    503,
    "DATABASE_UNAVAILABLE",
    "The database request failed. Check backend setup and migrations.",
  );
}
