import { Elysia, t } from "elysia";
import { authMiddleware } from "./auth";
import { getPriceHistory, getCurrentPrice } from "../services/priceService";
import { getMovementTokens, isValidMovementToken } from "../services/movementTokens";

export const priceRoutes = new Elysia()
  .use(authMiddleware)
  .post(
    "/get-price-history",
    async ({ body, user, authError, set }) => {
      if (authError || !user) {
        set.status = 401;
        return { status: "error", message: authError || "Unauthorized" };
      }

      try {
        const { address, timeFrom, timeTo, timeInterval } = body;

        if (!address) {
          set.status = 400;
          return { status: "error", message: "Token address is required" };
        }

        // Validate it's a Movement Labs token
        const tokens = await getMovementTokens();
        if (!isValidMovementToken(address, tokens)) {
          set.status = 400;
          return {
            status: "error",
            message: "Token not found in Movement Labs token list. Only Movement tokens are supported.",
          };
        }

        const priceHistory = await getPriceHistory(
          address,
          timeFrom ?? Math.floor(Date.now() / 1000) - 86400,
          timeTo ?? Math.floor(Date.now() / 1000),
          timeInterval ?? "1H"
        );

        return { status: "success", data: priceHistory };
      } catch (error) {
        console.error("Price history error:", error);
        set.status = 500;
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Failed to fetch price history",
        };
      }
    },
    {
      body: t.Object({
        address: t.String(),
        timeFrom: t.Optional(t.Number()),
        timeTo: t.Optional(t.Number()),
        timeInterval: t.Optional(t.String()),
      }),
    }
  )
  .get("/price/:address", async ({ params, user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { status: "error", message: authError || "Unauthorized" };
    }

    try {
      const { address } = params;

      const tokens = await getMovementTokens();
      if (!isValidMovementToken(address, tokens)) {
        set.status = 400;
        return { status: "error", message: "Token not found in Movement Labs token list" };
      }

      const price = await getCurrentPrice(address);

      return {
        status: "success",
        data: { address, price, timestamp: Date.now() },
      };
    } catch (error) {
      console.error("Get price error:", error);
      set.status = 500;
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch price",
      };
    }
  });
