import express from "express";
import { createFounderRouter } from "../server/founder/router.mjs";
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  express.json({
    limit: "16kb",
    verify: (req, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(createFounderRouter());
app.use((err, _req, res, _next) =>
  res
    .status(err.type === "entity.too.large" ? 413 : 400)
    .json({ error: "Invalid JSON request.", code: "INVALID_BODY" }),
);
export default app;
