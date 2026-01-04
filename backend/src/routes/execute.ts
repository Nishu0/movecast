import { Elysia, t } from "elysia";
import { authMiddleware } from "./auth";
import { getTokenByAddress, getTokenBySymbol, getMovementTokens } from "../services/movementTokens";
import { getCurrentPrice, getTokenInfo } from "../services/priceService";

export const executeRoutes = new Elysia()
  .use(authMiddleware)
  .post(
    "/execute.action",
    async ({ body, user, authError, set }) => {
      if (authError || !user) {
        set.status = 401;
        return { status: "error", message: authError || "Unauthorized" };
      }

      try {
        const { method, params = {} } = body;

        switch (method) {
          case "getToken": {
            const tokenId = (params as { tokenId?: string }).tokenId;
            if (!tokenId) {
              set.status = 400;
              return { status: "error", message: "tokenId is required" };
            }

            let token = await getTokenByAddress(tokenId);
            if (!token) {
              token = await getTokenBySymbol(tokenId);
            }

            if (!token) {
              set.status = 404;
              return { status: "error", message: "Token not found in Movement Labs token list" };
            }

            // Get complete token info with actual price changes
            const tokenInfo = await getTokenInfo(token);

            return { status: "success", data: tokenInfo };
          }

          case "getTokenDataByTicker": {
            const ticker = (params as { ticker?: string }).ticker;
            if (!ticker) {
              set.status = 400;
              return { status: "error", message: "ticker is required" };
            }

            const token = await getTokenBySymbol(ticker);

            if (!token) {
              set.status = 404;
              return { status: "error", message: `Token with ticker "${ticker}" not found` };
            }

            return {
              status: "success",
              data: { address: token.faAddress, symbol: token.symbol, name: token.name },
            };
          }

          case "getTokenList": {
            const tokens = await getMovementTokens();
            return { status: "success", data: tokens };
          }

          case "getPortfolio": {
            // Mock portfolio data
            const tokens = await getMovementTokens();
            const portfolio = [];

            for (const token of tokens.slice(0, 5)) {
              const price = await getCurrentPrice(token.faAddress);
              const balance = Math.random() * 1000;
              portfolio.push({
                address: token.faAddress,
                decimals: token.decimals,
                balance: balance * Math.pow(10, token.decimals),
                uiAmount: balance,
                chainId: "movement",
                name: token.name,
                symbol: token.symbol,
                icon: token.logoUrl,
                logoURI: token.logoUrl,
                priceUsd: price,
                valueUsd: balance * price,
              });
            }

            return { status: "success", data: portfolio };
          }

          default:
            set.status = 400;
            return { status: "error", message: `Unknown method: ${method}` };
        }
      } catch (error) {
        console.error("Execute action error:", error);
        set.status = 500;
        return {
          status: "error",
          message: error instanceof Error ? error.message : "Action execution failed",
        };
      }
    },
    {
      body: t.Object({
        method: t.String(),
        params: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    }
  );
