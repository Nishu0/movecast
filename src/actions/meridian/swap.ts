import { getAccountFromPrivateKey, getClient } from "../../utils/aptos";

// Meridian Router contract address
const MERIDIAN_ROUTER = "0xc36ceb6d7b137cea4897d4bc82d8e4d8be5f964c4217dbc96b0ba03cc64070f4";

/**
 * Execute swap on Meridian DEX
 * @param privateKeyHex Private key in hex format
 * @param inputTokenType Type argument for input token (e.g., "0x1::aptos_coin::AptosCoin")
 * @param pools Array of pool addresses for routing
 * @param tokens Array of token metadata addresses for routing
 * @param amountIn Amount to swap (in smallest unit)
 * @param outputTokenMetadata Output token metadata address
 * @param minAmountOut Minimum amount out (slippage protection)
 * @param network Network to perform the swap on
 * @returns Transaction hash
 */
export async function swapTokens(
  privateKeyHex: string,
  inputTokenType: string,
  pools: string[],
  tokens: string[],
  amountIn: bigint,
  outputTokenMetadata: string,
  minAmountOut: bigint,
  network: "mainnet" | "testnet" | "devnet" = "mainnet",
): Promise<{ hash: string }> {
  try {
    console.log("[Meridian Swap] Starting swap operation...");
    console.log("[Meridian Swap] Input token type:", inputTokenType);
    console.log("[Meridian Swap] Pools:", pools);
    console.log("[Meridian Swap] Tokens:", tokens);
    console.log("[Meridian Swap] Amount in:", amountIn.toString());
    console.log("[Meridian Swap] Output token:", outputTokenMetadata);
    console.log("[Meridian Swap] Min amount out:", minAmountOut.toString());
    console.log("[Meridian Swap] Network:", network);

    // Validate inputs
    if (!inputTokenType) {
      throw new Error("Input token type must be provided");
    }

    if (pools.length === 0) {
      throw new Error("At least one pool must be provided");
    }

    if (tokens.length === 0) {
      throw new Error("At least one token must be provided");
    }

    if (amountIn <= 0n) {
      throw new Error("Amount must be greater than 0");
    }

    if (!outputTokenMetadata) {
      throw new Error("Output token must be provided");
    }

    console.log("[Meridian Swap] Creating account from private key...");
    const account = getAccountFromPrivateKey(privateKeyHex);
    console.log("[Meridian Swap] Account address:", account.accountAddress.toString());

    console.log("[Meridian Swap] Getting Aptos client...");
    const client = getClient(network);

    // Build transaction
    const functionName = `${MERIDIAN_ROUTER}::router::swap_exact_in_router_entry`;
    console.log("[Meridian Swap] Building transaction...");
    console.log("[Meridian Swap] Function:", functionName);

    const transaction = await client.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: functionName,
        typeArguments: [inputTokenType],
        functionArguments: [
          pools,
          tokens,
          amountIn,
          outputTokenMetadata,
          minAmountOut,
        ],
      },
    });
    console.log("[Meridian Swap] Transaction built successfully");

    // Sign and submit the transaction
    console.log("[Meridian Swap] Signing and submitting transaction...");
    const pendingTransaction = await client.signAndSubmitTransaction({
      signer: account,
      transaction,
    });
    console.log("[Meridian Swap] Transaction submitted, hash:", pendingTransaction.hash);

    // Wait for transaction to be confirmed
    console.log("[Meridian Swap] Waiting for transaction confirmation...");
    const committedTransaction = await client.waitForTransaction({
      transactionHash: pendingTransaction.hash,
    });
    console.log("[Meridian Swap] Transaction confirmed, success:", committedTransaction.success);

    // Check if transaction was successful
    if (!committedTransaction.success) {
      console.error("[Meridian Swap] Transaction failed:", committedTransaction);
      throw new Error(`Swap failed: ${committedTransaction.vm_status || "Unknown error"}`);
    }

    console.log("[Meridian Swap] Swap operation completed successfully!");
    return {
      hash: pendingTransaction.hash,
    };
  } catch (error) {
    console.error("[Meridian Swap] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Token swap failed: ${message}`);
  }
}

/**
 * Parse Meridian quote payload from their UI
 * Example payload:
 * {
 *   "function": "0xc36ceb6d7b137cea4897d4bc82d8e4d8be5f964c4217dbc96b0ba03cc64070f4::router::swap_exact_in_router_entry",
 *   "functionArguments": [
 *     ["0x254d...", "0xf366...", "0xf9b3..."],  // pools
 *     ["0x8312...", "0xb06f...", "0x4477..."],  // tokens
 *     20000000,  // amount in
 *     "0xa",     // output token
 *     7808       // min amount out
 *   ],
 *   "typeArguments": ["0x1::aptos_coin::AptosCoin"]
 * }
 */
export interface MeridianPayload {
  function: string;
  functionArguments: [string[], string[], number, string, number];
  typeArguments: string[];
}

export function parsePayload(payload: MeridianPayload): {
  pools: string[];
  tokens: string[];
  amountIn: bigint;
  outputToken: string;
  minAmountOut: bigint;
  inputTokenType: string;
} {
  return {
    pools: payload.functionArguments[0],
    tokens: payload.functionArguments[1],
    amountIn: BigInt(payload.functionArguments[2]),
    outputToken: payload.functionArguments[3],
    minAmountOut: BigInt(payload.functionArguments[4]),
    inputTokenType: payload.typeArguments[0],
  };
}

/**
 * Execute swap using Meridian payload directly
 */
export async function swapWithPayload(
  privateKeyHex: string,
  payload: MeridianPayload,
  network: "mainnet" | "testnet" | "devnet" = "mainnet",
): Promise<{ hash: string }> {
  const parsed = parsePayload(payload);
  
  return swapTokens(
    privateKeyHex,
    parsed.inputTokenType,
    parsed.pools,
    parsed.tokens,
    parsed.amountIn,
    parsed.outputToken,
    parsed.minAmountOut,
    network,
  );
}
