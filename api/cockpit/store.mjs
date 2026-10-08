import { DatabaseSync } from "node:sqlite";
import {
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export function createStore(file) {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  // Per-database local encryption key; never returned by the API or stored in exports.
  let credentialKey;
  if (file === ":memory:") credentialKey = randomBytes(32);
  else {
    const keyPath = file + ".key";
    try {
      writeFileSync(keyPath, randomBytes(32), { flag: "wx", mode: 0o600 });
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    credentialKey = readFileSync(keyPath);
    if (credentialKey.length !== 32)
      throw new Error(
        "The database credential key is invalid. Restore the correct key from backup.",
      );
  }
  const encrypt = (value) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", credentialKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    return JSON.stringify({
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: encrypted.toString("base64"),
    });
  };
  const decrypt = (encoded) => {
    const value = JSON.parse(encoded);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      credentialKey,
      Buffer.from(value.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(value.data, "base64")),
        decipher.final(),
      ]).toString("utf8"),
    );
  };
  const db = new DatabaseSync(file);
  if (file !== ":memory:") chmodSync(file, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,creator_id TEXT NOT NULL,data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS records_owner ON records(kind,creator_id);
    CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,creator_id TEXT NOT NULL,campaign_id TEXT,tracked_link_id TEXT,source_id TEXT,peer_id TEXT,session_id TEXT NOT NULL,type TEXT NOT NULL,timestamp TEXT NOT NULL,data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS events_owner_time ON events(creator_id,timestamp);
    CREATE TABLE IF NOT EXISTS conversions(id TEXT PRIMARY KEY,creator_id TEXT NOT NULL,external_id TEXT,created_at TEXT NOT NULL,data TEXT NOT NULL,UNIQUE(creator_id,external_id));
    CREATE TABLE IF NOT EXISTS provider_tokens(account_id TEXT PRIMARY KEY,creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,encrypted TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_states(state_hash TEXT PRIMARY KEY,creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,session_hash TEXT NOT NULL,expires INTEGER NOT NULL);`);
  const get = (kind, key) => {
    const r = db
      .prepare("SELECT data FROM records WHERE kind=? AND id=?")
      .get(kind, key);
    return r ? JSON.parse(r.data) : null;
  };
  const list = (kind, owner) =>
    db
      .prepare(
        `SELECT data FROM records WHERE kind=?${owner ? " AND creator_id=?" : ""}`,
      )
      .all(...(owner ? [kind, owner] : [kind]))
      .map((r) => JSON.parse(r.data));
  const save = (kind, data) => {
    db.prepare(
      "INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,creator_id=excluded.creator_id",
    ).run(data.id, kind, data.creator_id, JSON.stringify(data));
    return data;
  };
  const add = (kind, owner, fields = {}) =>
    save(kind, { id: id(), creator_id: owner, created_at: now(), ...fields });
  const transaction = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  const event = (data) => {
    const link = data.tracked_link_id
      ? get("link", data.tracked_link_id)
      : null;
    const e = {
      id: id(),
      timestamp: now(),
      medium: link ? (link.peer_id ? "peer" : "campaign") : "website",
      destination: link?.destination || null,
      ...data,
    };
    db.prepare("INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?,?)").run(
      e.id,
      e.creator_id,
      e.campaign_id || null,
      e.tracked_link_id || null,
      e.source_id || null,
      e.peer_id || null,
      e.session_id,
      e.type,
      e.timestamp,
      JSON.stringify(e),
    );
    return e;
  };
  const events = (owner) =>
    db
      .prepare("SELECT data FROM events WHERE creator_id=? ORDER BY timestamp")
      .all(owner)
      .map((r) => JSON.parse(r.data));
  const conversions = (owner) =>
    db
      .prepare(
        "SELECT data FROM conversions WHERE creator_id=? ORDER BY created_at",
      )
      .all(owner)
      .map((r) => JSON.parse(r.data));
  const tokens = {
    save: (accountId, owner, value) =>
      db
        .prepare(
          "INSERT INTO provider_tokens VALUES(?,?,?) ON CONFLICT(account_id) DO UPDATE SET encrypted=excluded.encrypted,creator_id=excluded.creator_id",
        )
        .run(accountId, owner, encrypt(value)),
    get: (accountId, owner) => {
      const row = db
        .prepare(
          "SELECT encrypted FROM provider_tokens WHERE account_id=? AND creator_id=?",
        )
        .get(accountId, owner);
      return row ? decrypt(row.encrypted) : null;
    },
    remove: (accountId, owner) =>
      db
        .prepare(
          "DELETE FROM provider_tokens WHERE account_id=? AND creator_id=?",
        )
        .run(accountId, owner),
  };
  return {
    tokens,
    db,
    get,
    list,
    save,
    add,
    transaction,
    event,
    events,
    conversions,
    close: () => db.close(),
  };
}
