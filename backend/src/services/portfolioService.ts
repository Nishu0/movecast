import { getOrCreateWallet, getMoveBalance } from "./walletService";
import { getTokenByAddress, getMovementTokens } from "./movementTokens";
import { getCurrentPrice } from "./priceService";
import { MovementToken } from "../types";

// Movement mainnet RPC endpoint
const MOVEMENT_RPC = "https://mainnet.movementnetwork.xyz/v1";

interface CoinStoreResource {
  type: string;
  data: {
    coin: {
      value: string;
    };
    frozen: boolean;
  };
}

interface FungibleAssetBalance {
  type: string;
  data: {
    balance: string;
  };
}

export interface PortfolioToken {
  address: string;
  decimals: number;
  balance: number;
  uiAmount: number;
  chainId: string;
  name: string;
  symbol: string;
  icon: string;
  logoURI: string;
  priceUsd: number;
  valueUsd: number;
}

export interface PortfolioData {
  wallet: string;
  totalUsd: number;
  items: PortfolioToken[];
}

/**
 * Fetch all resources for an account
 */
async function getAccountResources(address: string): Promise<Array<{ type: string; data: unknown }>> {
  try {
    const response = await fetch(`${MOVEMENT_RPC}/accounts/${address}/resources`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Account doesn't exist yet (unfunded)
        return [];
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json() as Array<{ type: string; data: unknown }>;
  } catch (error) {
    console.error("Error fetching account resources:", error);
    return [];
  }
}

/**
 * Parse coin type from CoinStore type string
 * e.g., "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>" -> "0x1::aptos_coin::AptosCoin"
 */
function parseCoinType(coinStoreType: string): string | null {
  const match = coinStoreType.match(/0x1::coin::CoinStore<(.+)>/);
  return match ? match[1] : null;
}

/**
 * Extract FA address from coin type if it's a Fungible Asset
 * e.g., "0x123abc...::some_module::CoinType" -> "0x123abc..."
 */
function extractFAAddress(coinType: string): string | null {
  const parts = coinType.split("::");
  if (parts.length >= 1) {
    return parts[0];
  }
  return null;
}

/**
 * Get portfolio for a user - fetches all tokens they own
 */
export async function getPortfolio(userId: string): Promise<PortfolioData> {
  const wallet = await getOrCreateWallet(userId);
  const address = wallet.address;
  
  // Get all known Movement tokens for matching
  const knownTokens = await getMovementTokens();
  const tokensByFA = new Map<string, MovementToken>();
  const tokensByCoinType = new Map<string, MovementToken>();
  
  for (const token of knownTokens) {
    if (token.faAddress) {
      tokensByFA.set(token.faAddress.toLowerCase(), token);
    }
    if (token.coinType) {
      tokensByCoinType.set(token.coinType.toLowerCase(), token);
    }
  }
  
  const portfolioItems: PortfolioToken[] = [];
  let totalUsd = 0;
  
  // Fetch account resources
  const resources = await getAccountResources(address);
  
  // Find all CoinStore resources (legacy coin standard)
  const coinStores = resources.filter(r => r.type.startsWith("0x1::coin::CoinStore<"));
  
  for (const coinStore of coinStores) {
    const coinType = parseCoinType(coinStore.type);
    if (!coinType) continue;
    
    const data = coinStore.data as CoinStoreResource["data"];
    const rawBalance = BigInt(data.coin.value);
    
    if (rawBalance === 0n) continue; // Skip zero balances
    
    // Check if it's the native MOVE token (AptosCoin)
    if (coinType === "0x1::aptos_coin::AptosCoin") {
      const decimals = 8;
      const uiAmount = Number(rawBalance) / Math.pow(10, decimals);
      const price = await getCurrentPrice("0x1");
      const valueUsd = uiAmount * price;
      
      // Use CoinGecko logo for MOVE token
      const moveLogoUrl = "https://assets.coingecko.com/coins/images/39345/standard/movement-testnet-token.png";
      
      portfolioItems.push({
        address: "0x1",
        decimals,
        balance: Number(rawBalance),
        uiAmount,
        chainId: "movement",
        name: "Movement",
        symbol: "MOVE",
        icon: moveLogoUrl,
        logoURI: moveLogoUrl,
        priceUsd: price,
        valueUsd,
      });
      
      totalUsd += valueUsd;
      continue;
    }
    
    // Try to match with known tokens
    let matchedToken = tokensByCoinType.get(coinType.toLowerCase());
    
    if (!matchedToken) {
      const faAddress = extractFAAddress(coinType);
      if (faAddress) {
        matchedToken = tokensByFA.get(faAddress.toLowerCase());
      }
    }
    
    if (matchedToken) {
      const decimals = matchedToken.decimals;
      const uiAmount = Number(rawBalance) / Math.pow(10, decimals);
      const price = await getCurrentPrice(matchedToken.faAddress);
      const valueUsd = uiAmount * price;
      
      portfolioItems.push({
        address: matchedToken.faAddress,
        decimals,
        balance: Number(rawBalance),
        uiAmount,
        chainId: "movement",
        name: matchedToken.name,
        symbol: matchedToken.symbol,
        icon: matchedToken.logoUrl,
        logoURI: matchedToken.logoUrl,
        priceUsd: price,
        valueUsd,
      });
      
      totalUsd += valueUsd;
    } else {
      // Unknown token - still show it with basic info
      const decimals = 8; // Default decimals
      const uiAmount = Number(rawBalance) / Math.pow(10, decimals);
      
      portfolioItems.push({
        address: coinType,
        decimals,
        balance: Number(rawBalance),
        uiAmount,
        chainId: "movement",
        name: "Unknown Token",
        symbol: coinType.split("::").pop() || "???",
        icon: "",
        logoURI: "",
        priceUsd: 0,
        valueUsd: 0,
      });
    }
  }
  
  // Sort by USD value (highest first)
  portfolioItems.sort((a, b) => b.valueUsd - a.valueUsd);
  
  return {
    wallet: address,
    totalUsd,
    items: portfolioItems,
  };
}

/**
 * Get specific token balance for a user
 */
export async function getTokenBalance(userId: string, tokenAddress: string): Promise<{
  balance: number;
  uiAmount: number;
  valueUsd: number;
} | null> {
  const portfolio = await getPortfolio(userId);
  const token = portfolio.items.find(
    t => t.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  
  if (!token) {
    return null;
  }
  
  return {
    balance: token.balance,
    uiAmount: token.uiAmount,
    valueUsd: token.valueUsd,
  };
}
