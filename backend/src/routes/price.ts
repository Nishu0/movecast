import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { getPriceHistory, getCurrentPrice } from "../services/priceService";
import { getMovementTokens, isValidMovementToken } from "../services/movementTokens";

const JWT_SECRET = process.env.JWT_SECRET || "movecast-secret-key-change-in-production";

export const priceRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: JWT_SECRET }))
  .use(bearer())
  .post(
    "/get-price-history",
    async ({ body, bearer, jwt, set }) => {
      // Verify JWT token
      if (!bearer) {
        set.status = 401;
        return { status: "error", message: "Missing authorization header" };
      }

      try {
        const user = await jwt.verify(bearer);
        if (!user) {
          set.status = 401;
          return { status: "error", message: "Invalid or expired token" };
        }
      } catch {
        set.status = 401;
        return { status: "error", message: "Invalid or expired token" };
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
  .get("/price/:address", async ({ params, bearer, jwt, set }) => {
    // Verify JWT token
    if (!bearer) {
      set.status = 401;
      return { status: "error", message: "Missing authorization header" };
    }

    try {
      const user = await jwt.verify(bearer);
      if (!user) {
        set.status = 401;
        return { status: "error", message: "Invalid or expired token" };
      }
    } catch {
      set.status = 401;
      return { status: "error", message: "Invalid or expired token" };
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
