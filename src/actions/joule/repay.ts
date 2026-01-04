import { getAccountFromPrivateKey, getClient } from "../../utils/aptos";

// Joule Finance contract address
const JOULE_CONTRACT = "0x6a164188af7bb6a8268339343a5afe0242292713709af8801dafba3a054dc2f2";

/**
 * Repay tokens to a Joule position
 * @param privateKeyHex Private key in hex format
 * @param assetType MoveStructId of the token to repay (e.g., "0x1::aptos_coin::AptosCoin")
 * @param amount Amount to repay (in human readable format)
 * @param positionId The position ID to repay to
 * @param decimals Decimals of the asset being repaid (default 8 for MOVE)
 * @param network Network to perform the operation on (default: mainnet)
 * @returns Transaction hash and position ID
 * @throws Error if repayment fails or parameters are invalid
 */
export async function repayToken(
  privateKeyHex: string,
  assetType: string,
  amount: number,
  positionId: string,
  decimals: number = 8,
  network: "mainnet" | "testnet" | "devnet" = "mainnet",
): Promise<{ hash: string; positionId: string }> {
  try {
    console.log("[Joule Repay] Starting repay operation...");
    console.log("[Joule Repay] Asset type:", assetType);
    console.log("[Joule Repay] Amount:", amount);
    console.log("[Joule Repay] Position ID:", positionId);
    console.log("[Joule Repay] Decimals:", decimals);
    console.log("[Joule Repay] Network:", network);

    // Validate inputs
    if (!assetType) {
      throw new Error("Asset type must be provided");
    }

    if (amount <= 0) {
      throw new Error("Repay amount must be greater than 0");
    }

    if (!positionId) {
      throw new Error("Position ID must be provided");
    }

    if (decimals < 0) {
      throw new Error("Decimals cannot be negative");
    }

    // Parse position ID as number
    const positionIdNum = parseInt(positionId, 10);
    if (isNaN(positionIdNum)) {
      throw new Error("Position ID must be a valid number");
    }
    console.log("[Joule Repay] Position ID (parsed):", positionIdNum);

    console.log("[Joule Repay] Creating account from private key...");
    const account = getAccountFromPrivateKey(privateKeyHex);
    console.log("[Joule Repay] Account address:", account.accountAddress.toString());

    console.log("[Joule Repay] Getting Aptos client...");
    const client = getClient(network);

    // Convert amount to smallest unit based on token decimals
    const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, decimals)));
    console.log("[Joule Repay] Amount in smallest unit:", amountInSmallestUnit.toString());

    // Build transaction with Joule contract
    // Function signature: repay<T0>(position_id: u64, amount: u64)
    const functionName = `${JOULE_CONTRACT}::pool::repay`;
    console.log("[Joule Repay] Building transaction...");
    console.log("[Joule Repay] Function:", functionName);
    console.log("[Joule Repay] Type arguments:", [assetType]);
    console.log("[Joule Repay] Position ID:", positionIdNum);
    console.log("[Joule Repay] Amount:", amountInSmallestUnit.toString());

    const transaction = await client.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: functionName,
        typeArguments: [assetType], // T0 - the token type
        functionArguments: [
          positionIdNum,           // position_id: u64 (as number)
          amountInSmallestUnit,    // amount: u64
        ],
      },
    });
    console.log("[Joule Repay] Transaction built successfully");

    // Sign and submit the transaction
    console.log("[Joule Repay] Signing and submitting transaction...");
    const pendingTransaction = await client.signAndSubmitTransaction({
      signer: account,
      transaction,
    });
    console.log("[Joule Repay] Transaction submitted, hash:", pendingTransaction.hash);

    // Wait for transaction to be confirmed
    console.log("[Joule Repay] Waiting for transaction confirmation...");
    const committedTransaction = await client.waitForTransaction({
      transactionHash: pendingTransaction.hash,
    });
    console.log("[Joule Repay] Transaction confirmed, success:", committedTransaction.success);

    // Check if transaction was successful
    if (!committedTransaction.success) {
      console.error("[Joule Repay] Transaction failed:", committedTransaction);
      throw new Error(`Repay failed: ${committedTransaction.vm_status || "Unknown error"}`);
    }

    console.log("[Joule Repay] Repay operation completed successfully!");
    return {
      hash: pendingTransaction.hash,
      positionId,
    };
  } catch (error) {
    console.error("[Joule Repay] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Token repay failed: ${message}`);
  }
}
