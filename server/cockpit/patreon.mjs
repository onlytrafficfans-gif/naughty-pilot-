import { randomBytes, createHash } from "node:crypto";
import { id, now } from "./store.mjs";
const ROOT = "https://www.patreon.com/api/oauth2/v2/";
const digest = (s) => createHash("sha256").update(s).digest("hex");
export const SUBSCRIPTION_PROVIDERS = [
  "OnlyFans",
  "Fansly",
  "Patreon",
  "Pornhub",
];
const fail = (message, status = 502, code = "sync_error") =>
  Object.assign(new Error(message), { status, code });
export function createPatreonService(
  store,
  {
    baseUrl,
    fetchImpl = globalThis.fetch,
    config = () => ({
      clientId: process.env.NP_PATREON_CLIENT_ID,
      clientSecret: process.env.NP_PATREON_CLIENT_SECRET,
    }),
  },
) {
  const callbackUrl = new URL("/api/cockpit/oauth/patreon/callback", baseUrl)
    .href;
  const configured = () => !!(config().clientId && config().clientSecret);
  const inflight = new Map();
  const setup = () => ({
    configured: configured(),
    callback_url: callbackUrl,
    message: configured()
      ? "OAuth app configured. Authorize Patreon to start syncing."
      : "Configure the Patreon OAuth app client ID and secret in server settings.",
  });
  async function request(url, options = {}) {
    let response;
    try {
      response = await fetchImpl(url, {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw fail(
        "Could not reach Patreon. Check the server network connection.",
      );
    }
    // Never expose provider bodies or access tokens in errors.
    if (response.status === 401)
      throw fail(
        "Patreon authorization expired or was revoked. Reconnect your account.",
        401,
        "reauthorize",
      );
    if (response.status === 403)
      throw fail(
        "Patreon did not grant creator/member access. Reconnect and approve the requested scopes.",
        403,
        "reauthorize",
      );
    if (response.status === 429)
      throw fail(
        "Patreon rate limit reached. Sync will retry later.",
        429,
        "rate_limited",
      );
    if (!response.ok)
      throw fail(
        `Patreon request failed (HTTP ${response.status}). Please try again later.`,
      );
    try {
      return await response.json();
    } catch {
      throw fail(
        "Patreon returned an unreadable response. Previous metrics were kept.",
      );
    }
  }
  async function exchange(fields) {
    const c = config();
    if (!configured())
      throw fail("Patreon OAuth app is not configured.", 503, "setup_required");
    const body = new URLSearchParams({
      ...fields,
      client_id: c.clientId,
      client_secret: c.clientSecret,
    });
    const token = await request("https://www.patreon.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (typeof token.access_token !== "string" || !token.access_token)
      throw fail(
        "Patreon did not issue an access token. Reconnect your account.",
        401,
        "reauthorize",
      );
    const expires = Number(token.expires_in);
    if (!Number.isFinite(expires) || expires <= 0)
      throw fail(
        "Patreon returned invalid token expiry data. Reconnect your account.",
      );
    return {
      access_token: token.access_token,
      refresh_token: token.refresh_token || fields.refresh_token,
      expires_at: Date.now() + expires * 1000,
    };
  }
  function begin(owner, sessionToken) {
    if (!configured())
      throw fail(
        "Patreon OAuth app is not configured. Add its client ID and secret in environment settings.",
        503,
        "setup_required",
      );
    const state = randomBytes(32).toString("hex");
    store.db
      .prepare("DELETE FROM oauth_states WHERE expires<?")
      .run(Date.now());
    store.db
      .prepare("INSERT INTO oauth_states VALUES(?,?,?,?)")
      .run(digest(state), owner, digest(sessionToken), Date.now() + 10 * 60000);
    const url = new URL("https://www.patreon.com/oauth2/authorize");
    for (const [k, v] of Object.entries({
      response_type: "code",
      client_id: config().clientId,
      redirect_uri: callbackUrl,
      scope: "identity campaigns campaigns.members",
      state,
    }))
      url.searchParams.set(k, v);
    return { authorization_url: url.href };
  }
  async function callback(owner, sessionToken, { state, code, denied }) {
    if (typeof state !== "string" || !/^[a-f0-9]{64}$/.test(state))
      throw fail(
        "Invalid Patreon authorization state. Start the connection again.",
        400,
        "invalid_state",
      );
    const hash = digest(state);
    const record = store.db
      .prepare("SELECT * FROM oauth_states WHERE state_hash=?")
      .get(hash);
    if (
      !record ||
      record.creator_id !== owner ||
      record.session_hash !== digest(sessionToken) ||
      record.expires < Date.now()
    )
      throw fail(
        "Patreon authorization expired or belongs to another session. Start again.",
        400,
        "invalid_state",
      );
    store.db.prepare("DELETE FROM oauth_states WHERE state_hash=?").run(hash);
    if (denied)
      throw fail(
        "Patreon authorization was cancelled. No account was connected.",
        400,
        "denied",
      );
    if (typeof code !== "string" || code.length > 2048)
      throw fail(
        "Patreon did not return an authorization code.",
        400,
        "invalid_code",
      );
    const tokens = await exchange({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
    });
    const old = store
      .list("account", owner)
      .find((a) => a.provider === "Patreon");
    const account = {
      ...(old || { id: id(), creator_id: owner, created_at: now() }),
      provider: "Patreon",
      authorization_id: id(),
      status: "connected",
      message: "Authorized. Waiting for the first successful subscriber sync.",
      last_sync: null,
      metrics: null,
    };
    store.transaction(() => {
      store.save("account", account);
      store.tokens.save(account.id, owner, tokens);
    });
    try {
      return await sync(account);
    } catch {
      return store.get("account", account.id);
    }
  }
  function assertApiUrl(value, path) {
    let u;
    try {
      u = new URL(value, ROOT);
    } catch {
      throw fail("Patreon returned an invalid pagination URL.");
    }
    if (
      u.origin !== "https://www.patreon.com" ||
      u.pathname !== new URL(path, ROOT).pathname ||
      u.username ||
      u.password ||
      u.hash
    )
      throw fail(
        "Patreon returned an unexpected pagination URL. Previous metrics were kept.",
      );
    return u.href;
  }
  async function pages(path, token) {
    const initial = new URL(path, ROOT);
    let url = initial.href;
    const seen = new Set(),
      records = new Map();
    for (let page = 0; url && page < 100; page++) {
      const pageUrl = new URL(url);
      for (const [key, value] of initial.searchParams)
        if (key.startsWith("fields[") || key === "page[count]")
          pageUrl.searchParams.set(key, value);
      url = pageUrl.href;
      if (seen.has(url))
        throw fail(
          "Patreon pagination did not complete. Previous metrics were kept.",
        );
      seen.add(url);
      const data = await request(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!Array.isArray(data.data))
        throw fail(
          "Patreon returned incomplete member data. Previous metrics were kept.",
        );
      for (const row of data.data) {
        if (!row.id || !row.attributes)
          throw fail(
            "Patreon returned invalid member data. Previous metrics were kept.",
          );
        records.set(row.id, row);
      }
      const next = data.links?.next;
      url = next
        ? assertApiUrl(typeof next === "string" ? next : next.href, path)
        : null;
    }
    if (url)
      throw fail(
        "Patreon sync exceeded the pagination limit. No partial count was saved.",
      );
    return [...records.values()];
  }
  async function syncInternal(account) {
    if (account.provider !== "Patreon")
      throw fail(
        "This platform does not have a configured official subscriber API.",
        400,
      );
    try {
      let tokens = store.tokens.get(account.id, account.creator_id);
      if (!tokens)
        throw fail(
          "Patreon is disconnected. Reconnect to sync subscribers.",
          401,
          "reauthorize",
        );
      if (tokens.expires_at < Date.now() + 60000) {
        if (!tokens.refresh_token)
          throw fail(
            "Patreon authorization expired. Reconnect your account.",
            401,
            "reauthorize",
          );
        tokens = await exchange({
          grant_type: "refresh_token",
          refresh_token: tokens.refresh_token,
        });
        const fresh = store.get("account", account.id);
        if (
          !fresh ||
          fresh.status === "disconnected" ||
          fresh.authorization_id !== account.authorization_id ||
          !store.tokens.get(account.id, account.creator_id)
        )
          throw fail(
            "The account authorization changed during sync.",
            409,
            "disconnected",
          );
        store.tokens.save(account.id, account.creator_id, tokens);
      }
      const campaigns = await pages(
        "campaigns?fields[campaign]=creation_name,url&page[count]=100",
        tokens.access_token,
      );
      if (!campaigns.length)
        throw fail(
          "No creator campaign was returned. Authorize a Patreon creator account.",
          403,
          "reauthorize",
        );
      let activePaid = 0,
        activeFree = 0,
        totalMembers = 0;
      for (const campaign of campaigns) {
        if (!/^\d+$/.test(campaign.id))
          throw fail("Patreon returned an invalid campaign ID.");
        const members = await pages(
          `campaigns/${campaign.id}/members?fields[member]=patron_status,currently_entitled_amount_cents&page[count]=1000`,
          tokens.access_token,
        );
        for (const member of members) {
          const attrs = member.attributes;
          if (
            !Object.hasOwn(attrs, "patron_status") ||
            !Object.hasOwn(attrs, "currently_entitled_amount_cents")
          )
            throw fail(
              "Patreon member fields were incomplete. Previous metrics were kept.",
            );
          const amount = Number(attrs.currently_entitled_amount_cents);
          if (!Number.isFinite(amount) || amount < 0)
            throw fail("Patreon returned invalid entitlement data.");
          totalMembers++;
          if (attrs.patron_status === "active_patron") {
            if (amount > 0) activePaid++;
            else activeFree++;
          }
        }
      }
      // Abort writes if the creator disconnected while the provider was being fetched.
      const current = store.get("account", account.id);
      if (
        !current ||
        current.status === "disconnected" ||
        current.authorization_id !== account.authorization_id ||
        !store.tokens.get(account.id, account.creator_id)
      )
        throw fail(
          "The account was disconnected during sync.",
          409,
          "disconnected",
        );
      const timestamp = now();
      const metrics = {
        current_subscribers: activePaid,
        active_free_members: activeFree,
        total_member_records: totalMembers,
        campaigns: campaigns.length,
        basis: "Patreon active_patron with paid entitlement",
        evidence: "official_api",
        measured_at: timestamp,
      };
      let creatorUrl = current.url || "";
      try {
        const candidate = new URL(campaigns[0].attributes.url);
        if (
          candidate.protocol === "https:" &&
          (candidate.hostname === "www.patreon.com" ||
            candidate.hostname === "patreon.com")
        )
          creatorUrl = candidate.href;
      } catch {}
      const updated = {
        ...current,
        url: creatorUrl,
        status: "connected",
        message:
          "Paid subscriber count synced from Patreon. Campaign attribution is measured separately.",
        metrics,
        last_sync: timestamp,
        last_attempt: timestamp,
      };
      store.transaction(() => {
        store.save("account", updated);
        store.add("subscriber_snapshot", account.creator_id, {
          account_id: account.id,
          provider: "Patreon",
          ...metrics,
        });
        store.add("sync", account.creator_id, {
          account_id: account.id,
          status: "success",
          message: "Patreon aggregate subscriber count synced.",
        });
      });
      return updated;
    } catch (e) {
      const current = store.get("account", account.id);
      if (
        current &&
        current.status !== "disconnected" &&
        current.authorization_id === account.authorization_id
      ) {
        const message = e.code
          ? e.message
          : "Subscriber sync failed. Previous metrics were kept.";
        store.save("account", {
          ...current,
          status:
            e.code === "reauthorize" ? "needs_reauthorization" : "sync_error",
          message,
          last_attempt: now(),
        });
        store.add("sync", account.creator_id, {
          account_id: account.id,
          status: "failed",
          message,
        });
      }
      throw e.code
        ? e
        : fail("Subscriber sync failed. Previous metrics were kept.");
    }
  }
  function sync(account) {
    if (inflight.has(account.id)) return inflight.get(account.id);
    const promise = syncInternal(account).finally(() =>
      inflight.delete(account.id),
    );
    inflight.set(account.id, promise);
    return promise;
  }
  function disconnect(account) {
    store.tokens.remove(account.id, account.creator_id);
    return store.save("account", {
      ...account,
      status: "disconnected",
      message: "Disconnected. Local authorization tokens removed.",
      metrics: null,
      last_sync: null,
    });
  }
  async function syncDue() {
    if (!configured()) return;
    const accounts = store
      .list("account")
      .filter(
        (a) =>
          a.provider === "Patreon" &&
          ["connected", "sync_error"].includes(a.status) &&
          (!a.last_attempt ||
            Date.now() - Date.parse(a.last_attempt) >= 5 * 60000),
      );
    for (const a of accounts) {
      try {
        await sync(a);
      } catch {}
    }
  }
  return { setup, begin, callback, sync, disconnect, syncDue };
}
