import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createStore } from "./cockpit/store.mjs";
import { createCockpitRouter } from "./cockpit/router.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
export async function createLocalServer() {
  loadEnvLocal();
  const port = Number(process.env.PORT || 4178);
  const production = process.env.NODE_ENV === "production";
  const baseUrl =
    process.env.NP_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://127.0.0.1:${port}`;
  if (production && !baseUrl.startsWith("https://"))
    throw new Error("Production requires an HTTPS NP_BASE_URL.");
  const store = createStore(
    process.env.NP_DB_PATH || path.join(root, ".data", "cockpit.sqlite"),
  );
  const app = express();
  app.disable("x-powered-by");
  if (process.env.NP_TRUST_PROXY_HOPS) {
    const hops = Number(process.env.NP_TRUST_PROXY_HOPS);
    if (!Number.isInteger(hops) || hops < 0 || hops > 10)
      throw new Error("NP_TRUST_PROXY_HOPS must be an integer from 0 to 10.");
    app.set("trust proxy", hops);
  }
  app.get("/healthz", (_req, res) => {
    try {
      store.db.prepare("SELECT 1").get();
      res.set("Cache-Control", "no-store").json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  app.use(express.json({ limit: "16kb" }));
  const cockpitRouter = createCockpitRouter(store, {
    development: !production,
    baseUrl,
  });
  app.use(cockpitRouter);
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  let vite;
  if (production) {
    app.use(express.static(path.join(root, "dist")));
    app.get(
      [
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
      ],
      (req, res) => res.sendFile(path.join(root, "dist", "index.html")),
    );
  } else {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      root,
      server: { middlewareMode: true, hmr: { port: port + 20000 } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
  const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(`Naughty Pilot cockpit listening on ${port}`),
  );
  const syncTimer = setInterval(
    () => cockpitRouter.syncDueAccounts().catch(() => {}),
    60000,
  );
  syncTimer.unref();
  server.on("close", () => clearInterval(syncTimer));
  const close = async () => {
    clearInterval(syncTimer);
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    if (vite) await vite.close();
    store.close();
  };
  return { app, server, store, close };
}
