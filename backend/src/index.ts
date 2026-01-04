import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { authRoutes } from "./routes/auth";
import { priceRoutes } from "./routes/price";
import { tokenRoutes } from "./routes/token";
import { executeRoutes } from "./routes/execute";
import { initializePrices } from "./services/priceService";

const PORT = process.env.PORT || 8787;
const JWT_SECRET = process.env.JWT_SECRET || "movecast-secret-key-change-in-production";

const app = new Elysia()
  .use(cors())
  .use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
    })
  )
  .use(bearer())
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .group("/api", (app) =>
    app
      .use(authRoutes)
      .use(priceRoutes)
      .use(tokenRoutes)
      .use(executeRoutes)
  )
  .listen(PORT);

console.log(`🚀 MoveCast Backend running on http://localhost:${PORT}`);
console.log(`📊 Movement Labs tokens API ready`);
console.log(`🦊 Powered by Elysia + Bun`);
console.log(`🔮 Pyth Network price feeds enabled`);

// Initialize Pyth prices on startup
initializePrices().catch(console.error);

// Refresh prices every 30 seconds in background
setInterval(() => {
  initializePrices().catch(console.error);
}, 30 * 1000);

export type App = typeof app;
