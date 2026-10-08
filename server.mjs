import { createLocalServer } from "./api/_local-dev.mjs";

createLocalServer()
  .then(({ close }) => {
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      const timeout = setTimeout(() => process.exit(1), 10000);
      timeout.unref();
      close()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
