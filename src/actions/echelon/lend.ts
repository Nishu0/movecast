import { getAccountFromPrivateKey, getClient } from "../../utils/aptos";

// Echelon contract address
const ECHELON_CONTRACT = "0x6a01d5761d43a5b5a0ccbfc42edf2d02c0611464aae99a2ea0e0d4819f0550b5";

// MOVE pool address
const MOVE_POOL_ADDRESS = "0x568f96c4ed010869d810abcf348f4ff6b66d14ff09672fb7b5872e4881a25db7";

/**
 * Supply/Lend tokens to Echelon
 * @param privateKeyHex Private key in hex format
 * @param poolAddress The pool address to supply to
 * @param amount Amount to supply (in smallest unit)
 * @param isMoveToken Whether this is the native MOVE token
 * @param network Network to perform the operation on
 * @returns Transaction hash
 */
export async function supplyToEchelon(
  privateKeyHex: string,
  poolAddress: string,
  amount: bigint,
  isMoveToken: boolean,
  network: "mainnet" | "testnet" | "devnet" = "mainnet",
): Promise<{ hash: string }> {
  try {
    console.log("[Echelon Lend] Starting supply operation...");
    console.log("[Echelon Lend] Pool address:", poolAddress);
    console.log("[Echelon Lend] Amount:", amount.toString());
    console.log("[Echelon Lend] Is MOVE token:", isMoveToken);
    console.log("[Echelon Lend] Network:", network);

    // Validate inputs
    if (!poolAddress) {
      throw new Error("Pool address must be provided");
    }

    if (amount <= 0n) {
      throw new Error("Amount must be greater than 0");
    }

    console.log("[Echelon Lend] Creating account from private key...");
    const account = getAccountFromPrivateKey(privateKeyHex);
    console.log("[Echelon Lend] Account address:", account.accountAddress.toString());

    console.log("[Echelon Lend] Getting Aptos client...");
    const client = getClient(network);

    let transaction;

    if (isMoveToken) {
      // For MOVE token, use supply function with type argument
      const functionName = `${ECHELON_CONTRACT}::scripts::supply`;
      console.log("[Echelon Lend] Building transaction (MOVE token)...");
      console.log("[Echelon Lend] Function:", functionName);

      transaction = await client.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: functionName,
          typeArguments: ["0x1::aptos_coin::AptosCoin"],
          functionArguments: [
            poolAddress,  // pool address
            amount,       // amount
          ],
        },
      });
    } else {
      // For other tokens (fungible assets), use supply_fa function
      const functionName = `${ECHELON_CONTRACT}::scripts::supply_fa`;
      console.log("[Echelon Lend] Building transaction (FA token)...");
      console.log("[Echelon Lend] Function:", functionName);

      transaction = await client.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: functionName,
          typeArguments: [],
          functionArguments: [
            poolAddress,  // pool address
            amount,       // amount
          ],
        },
      });
    }
    console.log("[Echelon Lend] Transaction built successfully");

    // Sign and submit the transaction
    console.log("[Echelon Lend] Signing and submitting transaction...");
    const pendingTransaction = await client.signAndSubmitTransaction({
      signer: account,
      transaction,
    });
    console.log("[Echelon Lend] Transaction submitted, hash:", pendingTransaction.hash);

    // Wait for transaction to be confirmed
    console.log("[Echelon Lend] Waiting for transaction confirmation...");
    const committedTransaction = await client.waitForTransaction({
      transactionHash: pendingTransaction.hash,
    });
    console.log("[Echelon Lend] Transaction confirmed, success:", committedTransaction.success);

    // Check if transaction was successful
    if (!committedTransaction.success) {
      console.error("[Echelon Lend] Transaction failed:", committedTransaction);
      throw new Error(`Supply failed: ${committedTransaction.vm_status || "Unknown error"}`);
    }

    console.log("[Echelon Lend] Supply operation completed successfully!");
    return {
      hash: pendingTransaction.hash,
    };
  } catch (error) {
    console.error("[Echelon Lend] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Echelon supply failed: ${message}`);
  }
}

