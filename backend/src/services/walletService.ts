import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

// Movement mainnet RPC endpoint
const MOVEMENT_RPC = "https://mainnet.movementnetwork.xyz/v1";

// Secret salt for deterministic key derivation (in production, use env variable)
const WALLET_DERIVATION_SALT = process.env.WALLET_SALT || "movecast-wallet-salt-v1";

/**
 * Derive a deterministic private key from user ID
 * This ensures the same user always gets the same wallet, even after backend restarts
 */
async function derivePrivateKey(userId: string): Promise<Uint8Array> {
  // Create a deterministic seed from userId + salt
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + WALLET_DERIVATION_SALT);
  
  // Use SHA-256 to create a 32-byte key
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

/**
 * Get or create a wallet for a user based on their Google sub ID
 * Uses deterministic derivation so the same user always gets the same wallet
 */
export async function getOrCreateWallet(userId: string): Promise<{ address: string }> {
  // Derive deterministic private key from user ID
  const privateKeyBytes = await derivePrivateKey(userId);
  const privateKey = new Ed25519PrivateKey(privateKeyBytes);
  const account = Account.fromPrivateKey({ privateKey });
  const address = account.accountAddress.toString();

  return { address };
}

/**
 * Get wallet address for a user
 */
export async function getWalletAddress(userId: string): Promise<string> {
  const wallet = await getOrCreateWallet(userId);
  return wallet.address;
}

/**
 * Get wallet credentials (address + private key) for a user
 * WARNING: Private key is sensitive - only return to authenticated users for their own wallet
 */
export async function getWalletCredentials(userId: string): Promise<{
  address: string;
  privateKey: string;
}> {
  const privateKeyBytes = await derivePrivateKey(userId);
  const privateKey = new Ed25519PrivateKey(privateKeyBytes);
  const account = Account.fromPrivateKey({ privateKey });
  
  return {
    address: account.accountAddress.toString(),
    privateKey: Buffer.from(privateKeyBytes).toString("hex"),
  };
}

/**
 * Get MOVE balance for an address using native fetch (Bun compatible)
 */
export async function getMoveBalance(address: string): Promise<{
  balance: number;
  balanceFormatted: string;
}> {
  try {
    // Use native fetch to avoid got/Bun compatibility issues
    const response = await fetch(
      `${MOVEMENT_RPC}/accounts/${address}/resources`
    );

    if (!response.ok) {
      // Account doesn't exist yet (unfunded)
      if (response.status === 404) {
        return { balance: 0, balanceFormatted: "0" };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const resources = await response.json() as Array<{ type: string; data: unknown }>;
    
    // Find the coin store for AptosCoin (MOVE on Movement)
    const coinStore = resources.find(
      (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
    );

    if (!coinStore) {
      return { balance: 0, balanceFormatted: "0" };
    }

    const balance = BigInt((coinStore.data as { coin: { value: string } }).coin.value);
    const balanceNumber = Number(balance) / 1e8; // MOVE has 8 decimals

    return {
      balance: balanceNumber,
      balanceFormatted: balanceNumber.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }),
    };
  } catch (error) {
    console.error("Error fetching MOVE balance:", error);
    // Return 0 if account doesn't exist yet (unfunded)
    return { balance: 0, balanceFormatted: "0" };
  }
}

/**
 * Get account info including balance
 */
export async function getAccountInfo(userId: string): Promise<{
  address: string;
  balance: number;
  balanceFormatted: string;
  explorerUrl: string;
}> {
  const address = await getWalletAddress(userId);
  const { balance, balanceFormatted } = await getMoveBalance(address);

  return {
    address,
    balance,
    balanceFormatted,
    explorerUrl: `https://explorer.movementnetwork.xyz/account/${address}?network=mainnet`,
  };
}

