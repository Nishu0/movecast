import { getAccountFromPrivateKey, getClient } from "../../utils/aptos";
import tokenList from "../../token.json";

// Joule Finance contract address
const JOULE_CONTRACT = "0x6a164188af7bb6a8268339343a5afe0242292713709af8801dafba3a054dc2f2";

// Pyth Hermes endpoint for price feed updates
const PYTH_HERMES_ENDPOINT = "https://hermes.pyth.network";

interface TokenData {
  assetName: string;
  type: string;
  pythId: string;
  displayName: string;
  decimals: number;
  isFungible: boolean;
}

/**
 * Convert hex string to byte array (number[])
 */
function hexToBytes(hex: string): number[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
  }
  return bytes;
}

/**
 * Fetch VAA data from Pyth Hermes for price feeds
 * Returns array of byte arrays for vector<vector<u8>>
 */
async function fetchVaaData(): Promise<Uint8Array[]> {
  try {
    // Get all pythIds from token.json, excluding StakedApt and TruAPT
    const priceFeedIds = (tokenList as TokenData[])
      .filter(item => item.assetName !== 'StakedApt' && item.assetName !== 'TruAPT coin')
      .map(item => item.pythId);

    console.log("[Joule Borrow] Fetching VAA data for price feeds:", priceFeedIds);

    // Fetch price updates from Pyth Hermes
    const params = new URLSearchParams();
    priceFeedIds.forEach(id => params.append('ids[]', id));
    
    const response = await fetch(
      `${PYTH_HERMES_ENDPOINT}/v2/updates/price/latest?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Pyth API error: ${response.status}`);
    }

    const data = await response.json() as { binary: { data: string[] } };
    
    console.log("[Joule Borrow] Raw VAA data count:", data.binary.data.length);
    
    // Convert the binary VAA data to Uint8Array for the contract
    // Each VAA is a hex string that needs to be converted to vector<u8>
    const vaaData = data.binary.data.map((vaa: string) => {
      const bytes = hexToBytes(vaa);
      console.log("[Joule Borrow] VAA bytes length:", bytes.length);
      return new Uint8Array(bytes);
    });

    console.log("[Joule Borrow] Fetched VAA data, count:", vaaData.length);
    return vaaData;
  } catch (error) {
    console.error("[Joule Borrow] Error fetching VAA data:", error);
    throw new Error(`Failed to fetch Pyth price data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Borrow tokens from a Joule position
 * @param privateKeyHex Private key in hex format
 * @param assetType MoveStructId of the token to borrow (e.g., "0x1::aptos_coin::AptosCoin")
 * @param amount Amount to borrow (in human readable format)
 * @param positionId The position ID to borrow from
 * @param decimals Decimals of the asset being borrowed (default 8 for MOVE)
 * @param network Network to perform the operation on (default: mainnet)
 * @returns Transaction hash and position ID
 * @throws Error if borrowing fails or parameters are invalid
 */
export async function borrowToken(
  privateKeyHex: string,
  assetType: string,
  amount: number,
  positionId: string,
  decimals: number = 8,
  network: "mainnet" | "testnet" | "devnet" = "mainnet",
): Promise<{ hash: string; positionId: string }> {
  try {
    console.log("[Joule Borrow] Starting borrow operation...");
    console.log("[Joule Borrow] Asset type:", assetType);
    console.log("[Joule Borrow] Amount:", amount);
    console.log("[Joule Borrow] Position ID:", positionId);
    console.log("[Joule Borrow] Decimals:", decimals);
    console.log("[Joule Borrow] Network:", network);

    // Validate inputs
    if (!assetType) {
      throw new Error("Asset type must be provided");
    }

    if (amount <= 0) {
      throw new Error("Borrow amount must be greater than 0");
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
    console.log("[Joule Borrow] Position ID (parsed):", positionIdNum);

    console.log("[Joule Borrow] Creating account from private key...");
    const account = getAccountFromPrivateKey(privateKeyHex);
    console.log("[Joule Borrow] Account address:", account.accountAddress.toString());

    console.log("[Joule Borrow] Getting Aptos client...");
    const client = getClient(network);

    // Fetch VAA data from Pyth
    console.log("[Joule Borrow] Fetching VAA data from Pyth...");
    const vaaData = await fetchVaaData();

    // Convert amount to smallest unit based on token decimals
    const amountInSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, decimals)));
    console.log("[Joule Borrow] Amount in smallest unit:", amountInSmallestUnit.toString());

    // Build transaction with Joule contract
    // Function signature: borrow<T0>(position_id: u64, amount: u64, vaa_data: vector<vector<u8>>)
    const functionName = `${JOULE_CONTRACT}::pool::borrow`;
    console.log("[Joule Borrow] Building transaction...");
    console.log("[Joule Borrow] Function:", functionName);
    console.log("[Joule Borrow] Type arguments:", [assetType]);
    console.log("[Joule Borrow] Position ID:", positionIdNum);
    console.log("[Joule Borrow] Amount:", amountInSmallestUnit.toString());
    console.log("[Joule Borrow] VAA data entries:", vaaData.length);

    const transaction = await client.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: functionName,
        typeArguments: [assetType], // T0 - the token type
        functionArguments: [
          positionIdNum,           // position_id: u64 (as number)
          amountInSmallestUnit,    // amount: u64
          vaaData,                 // vaa_data: vector<vector<u8>>
        ],
      },
    });
    console.log("[Joule Borrow] Transaction built successfully");

    // Sign and submit the transaction
    console.log("[Joule Borrow] Signing and submitting transaction...");
    const pendingTransaction = await client.signAndSubmitTransaction({
      signer: account,
      transaction,
    });
    console.log("[Joule Borrow] Transaction submitted, hash:", pendingTransaction.hash);

    // Wait for transaction to be confirmed
    console.log("[Joule Borrow] Waiting for transaction confirmation...");
    const committedTransaction = await client.waitForTransaction({
      transactionHash: pendingTransaction.hash,
    });
    console.log("[Joule Borrow] Transaction confirmed, success:", committedTransaction.success);

    // Check if transaction was successful
    if (!committedTransaction.success) {
      console.error("[Joule Borrow] Transaction failed:", committedTransaction);
      throw new Error(`Borrow failed: ${committedTransaction.vm_status || "Unknown error"}`);
    }

    console.log("[Joule Borrow] Borrow operation completed successfully!");
    return {
      hash: pendingTransaction.hash,
      positionId,
    };
  } catch (error) {
    console.error("[Joule Borrow] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Token borrow failed: ${message}`);
  }
}
