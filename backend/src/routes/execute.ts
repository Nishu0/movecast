import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { getTokenByAddress, getTokenBySymbol, getMovementTokens } from "../services/movementTokens";
import { getCurrentPrice, getTokenInfo } from "../services/priceService";
import { getAccountInfo, getMoveBalance } from "../services/walletService";
import { getPortfolio } from "../services/portfolioService";

const JWT_SECRET = process.env.JWT_SECRET || "movecast-secret-key-change-in-production";

export const executeRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: JWT_SECRET }))
  .use(bearer())
  .post(
    "/execute.action",
    async ({ body, bearer, jwt, set }) => {
      // Verify JWT token
      if (!bearer) {
        set.status = 401;
        return { status: "error", message: "Missing authorization header" };
      }

      let user;
      try {
        user = await jwt.verify(bearer);
        if (!user) {
          set.status = 401;
          return { status: "error", message: "Invalid or expired token" };
        }
      } catch (error) {
        console.error("JWT verify error:", error);
        set.status = 401;
        return { status: "error", message: "Invalid or expired token" };
      }

      try {
        const { method, params = {} } = body;

        switch (method) {
          case "getWalletAddress": {
            // Get user's Movement wallet address
            const userId = (user as { sub: string }).sub;
            const accountInfo = await getAccountInfo(userId);
            return {
              status: "success",
              data: {
                address: accountInfo.address,
                explorerUrl: accountInfo.explorerUrl,
              },
            };
          }

          case "getMoveBalance": {
            // Get MOVE balance for the user's wallet
            const userId = (user as { sub: string }).sub;
            const accountInfo = await getAccountInfo(userId);
            return {
              status: "success",
              data: {
                address: accountInfo.address,
                balance: accountInfo.balance,
                balanceFormatted: accountInfo.balanceFormatted,
                symbol: "MOVE",
                explorerUrl: accountInfo.explorerUrl,
              },
            };
          }

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
            // Fetch real portfolio from user's wallet
            const userId = (user as { sub: string }).sub;
            const portfolio = await getPortfolio(userId);
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
