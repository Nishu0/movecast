import { getAccountFromPrivateKey, getClient } from "../../utils/aptos";

// Joule Finance contract address
const JOULE_CONTRACT = "0x6a164188af7bb6a8268339343a5afe0242292713709af8801dafba3a054dc2f2";

/**
 * Lend MOVE, tokens or fungible asset to a Joule position
 * @param privateKeyHex Private key in hex format
 * @param assetType MoveStructId of the token to lend (e.g., "0x1::aptos_coin::AptosCoin")
 * @param amount Amount to lend (in human readable format)
 * @param positionId The position ID to lend to
 * @param decimals Decimals of the asset being lent (default 8 for MOVE)
 * @param needToCreatePosition Whether to create a new position or not
 * @param network Network to perform the operation on (default: mainnet)
 * @returns Transaction hash and position ID
 * @throws Error if lending fails or parameters are invalid
 */
export async function lendToken(
  privateKeyHex: string,
  assetType: string,
  amount: number,
  positionId: string,
  decimals: number = 8,
  needToCreatePosition: boolean = false,
  network: "mainnet" | "testnet" | "devnet" = "mainnet",
): Promise<{ hash: string; positionId: string }> {
  try {
    console.log("[Joule Lend] Starting lend operation...");
    console.log("[Joule Lend] Asset type:", assetType);
    console.log("[Joule Lend] Amount:", amount);
    console.log("[Joule Lend] Position ID:", positionId);
    console.log("[Joule Lend] Decimals:", decimals);
    console.log("[Joule Lend] Need to create position:", needToCreatePosition);
    console.log("[Joule Lend] Network:", network);

    // Validate inputs
    if (!assetType) {
      throw new Error("Asset type must be provided");
    }

    if (amount <= 0) {
      throw new Error("Lend amount must be greater than 0");
    }

    if (!positionId) {
      throw new Error("Position ID must be provided");
    }

    if (decimals < 0) {
      throw new Error("Decimals cannot be negative");
    }

    console.log("[Joule Lend] Creating account from private key...");
    const account = getAccountFromPrivateKey(privateKeyHex);
    console.log("[Joule Lend] Account address:", account.accountAddress.toString());

    console.log("[Joule Lend] Getting Aptos client...");
    const client = getClient(network);

    // Convert amount to smallest unit based on token decimals
    const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, decimals)));
    console.log("[Joule Lend] Amount in smallest unit:", amountInSmallestUnit.toString());

    // Build transaction with Joule contract
    // Function signature: lend<T0>(position_id: String, amount: u64, need_to_create_position: bool)
    const functionName = `${JOULE_CONTRACT}::pool::lend`;
    console.log("[Joule Lend] Building transaction...");
    console.log("[Joule Lend] Function:", functionName);
    console.log("[Joule Lend] Type arguments:", [assetType]);
    console.log("[Joule Lend] Function arguments:", [positionId, amountInSmallestUnit.toString(), needToCreatePosition]);

    const transaction = await client.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: functionName,
        typeArguments: [assetType], // T0 - the token type
        functionArguments: [
          positionId,              // position_id: String
          amountInSmallestUnit,    // amount: u64
          needToCreatePosition,    // need_to_create_position: bool
        ],
      },
    });
    console.log("[Joule Lend] Transaction built successfully");

    // Sign and submit the transaction
    console.log("[Joule Lend] Signing and submitting transaction...");
    const pendingTransaction = await client.signAndSubmitTransaction({
      signer: account,
      transaction,
    });
    console.log("[Joule Lend] Transaction submitted, hash:", pendingTransaction.hash);

    // Wait for transaction to be confirmed
    console.log("[Joule Lend] Waiting for transaction confirmation...");
    const committedTransaction = await client.waitForTransaction({
      transactionHash: pendingTransaction.hash,
    });
    console.log("[Joule Lend] Transaction confirmed, success:", committedTransaction.success);

    // Check if transaction was successful
    if (!committedTransaction.success) {
      console.error("[Joule Lend] Transaction failed:", committedTransaction);
      throw new Error(`Lend failed: ${committedTransaction.vm_status || "Unknown error"}`);
    }

    console.log("[Joule Lend] Lend operation completed successfully!");
    return {
      hash: pendingTransaction.hash,
      positionId,
    };
  } catch (error) {
    console.error("[Joule Lend] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Token lend failed: ${message}`);
  }
}
