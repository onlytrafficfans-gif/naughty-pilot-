// Local contract verification only. Never deploy this authentication fixture.
import express from "express";
import { createFounderRouter } from "../../server/founder/router.mjs";
import { testBackend, founderId } from "./founder-backend.mjs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const backend = await testBackend();
if (process.env.NP_FOUNDER_BROWSER_FIXTURE === "true") {
  await backend.pg.query(
    "insert into np_records(creator_id,kind,data) values($1,$2,$3)",
    [
      founderId,
      "profile",
      JSON.stringify({
        display_name: "Founder fixture",
        destination: "https://example.com/founder",
        platform: "OnlyFans",
        niche: "Lifestyle",
        onboarded: true,
        current_subscribers: null,
      }),
    ],
  );
  await backend.db.rpc("np_create_campaign", {
    p_actor: founderId,
    p_data: {
      name: "Fixture campaign",
      source: "Reddit",
      destination: "https://example.com/founder",
      cost: 0,
    },
  });
}
const app = express();
app.use(
  express.json({
    verify: (req, _res, body) => {
      req.rawBody = Buffer.from(body);
    },
  }),
);
const founderRouter = createFounderRouter({
  config: { origin: "http://127.0.0.1:4190", adminId: founderId },
  backend,
  generate: async () => ({
    summary: "Browser fixture proposal",
    recommendations: ["Review this campaign"],
    copy: [],
    risks: ["Spending disabled"],
  }),
});
app.use((req, res, next) =>
  req.path.startsWith("/api/") || req.path.startsWith("/go/")
    ? founderRouter(req, res, next)
    : next(),
);
const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
app.use(express.static(resolve(root, "dist")));
app.get("*", (_req, res) => res.sendFile(resolve(root, "dist/index.html")));
const server = app.listen(4190, "127.0.0.1", () =>
  console.log("Fixture PostgreSQL API on 4190; auth is test-only."),
);
process.on("SIGINT", () =>
  server.close(async () => {
    await backend.close();
    process.exit(0);
  }),
);
