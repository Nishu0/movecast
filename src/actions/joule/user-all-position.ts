import { getClient } from "../../utils/aptos";
import type { NetworkType } from "../../types";
import { removeLastInterestRateIndex } from "../../utils/clean-joule-all-positions-list";

/**
 * Get details about a user's all positions
 * @param userAddress The address of the user
 * @param network Network to query (default: mainnet)
 * @returns List of user positions
 * @throws Error if fetching user positions fails or parameters are invalid
 * @example
 * ```ts
 * const positionsList = await getUserAllPositions("0x123...", "mainnet");
 * ```
 */
export async function getUserAllPositions(
  userAddress: string,
  network: NetworkType = "mainnet",
): Promise<any> {
  try {
    // Validate inputs
    if (!userAddress) {
      throw new Error("User address must be provided");
    }

    const client = getClient(network);
    const { aptos } = client.getClients();

    const result = await aptos.view({
      payload: {
        function: "0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::user_positions_map",
        functionArguments: [userAddress],
      },
    });

    if (!result) {
      throw new Error("Failed to fetch user all positions");
    }

    // TODO : make the amounts human readable // sync with shivam for all view function

    const cleanedResult = removeLastInterestRateIndex(result);

    return cleanedResult;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get user all positions: ${message}`);
  }
}