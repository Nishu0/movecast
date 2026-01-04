import { Elysia } from "elysia";
import { authMiddleware } from "./auth";
import {
  getMovementTokens,
  getTokenByAddress,
  getTokenBySymbol,
} from "../services/movementTokens";
import { getAllTokenPrices, getTokenInfo } from "../services/priceService";

export const tokenRoutes = new Elysia()
  .use(authMiddleware)
  .get("/tokens", async ({ user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { status: "error", message: authError || "Unauthorized" };
    }

    try {
      const tokens = await getMovementTokens();
      return { status: "success", data: tokens };
    } catch (error) {
      console.error("Get tokens error:", error);
      set.status = 500;
      return { status: "error", message: "Failed to fetch tokens" };
    }
  })
  .get("/tokens/prices", async ({ user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { status: "error", message: authError || "Unauthorized" };
    }

    try {
      const tokensWithPrices = await getAllTokenPrices();
      return { status: "success", data: tokensWithPrices };
    } catch (error) {
      console.error("Get token prices error:", error);
      set.status = 500;
      return { status: "error", message: "Failed to fetch token prices" };
    }
  })
  .get("/token/:identifier", async ({ params, user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { status: "error", message: authError || "Unauthorized" };
    }

    try {
      const { identifier } = params;

      // Try to find by address first, then by symbol
      let token = await getTokenByAddress(identifier);
      if (!token) {
        token = await getTokenBySymbol(identifier);
      }

      if (!token) {
        set.status = 404;
        return { status: "error", message: "Token not found in Movement Labs token list" };
      }

      // Get complete token info with actual price changes
      const tokenInfo = await getTokenInfo(token);

      return { status: "success", data: tokenInfo };
    } catch (error) {
      console.error("Get token error:", error);
      set.status = 500;
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch token info",
      };
    }
  });
