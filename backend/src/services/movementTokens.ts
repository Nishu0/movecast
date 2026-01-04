import { MovementToken, PythTokenData } from "../types";
import pythTokenData from "../../token.json";

const MOVEMENT_TOKENS_URL =
  "https://raw.githubusercontent.com/kitelabs-io/mvmt-tokens/main/token-list.json";

// Local Pyth token data
const pythTokens: PythTokenData[] = pythTokenData as PythTokenData[];

let cachedTokens: MovementToken[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Convert Pyth token to Movement token format
function pythToMovementToken(pythToken: PythTokenData): MovementToken {
  const faAddress = pythToken.faAddress
    ? pythToken.faAddress.replace(/^@/, "0x")
    : pythToken.type;

  return {
    faAddress,
    coinType: pythToken.type,
    symbol: pythToken.displayName,
    name: pythToken.assetName,
    decimals: Math.log10(pythToken.decimals),
    logoUrl: pythToken.icon,
  };
}

export async function getMovementTokens(): Promise<MovementToken[]> {
  const now = Date.now();

  if (cachedTokens && now - cacheTimestamp < CACHE_DURATION) {
    return cachedTokens;
  }

  try {
    const response = await fetch(MOVEMENT_TOKENS_URL);
    const data = (await response.json()) as MovementToken[];
    
    // Merge with Pyth tokens - Pyth tokens take priority for matching symbols
    const mergedTokens = [...data];
    
    for (const pythToken of pythTokens) {
      const pythAsMoveToken = pythToMovementToken(pythToken);
      const existingIndex = mergedTokens.findIndex(
        (t) => t.symbol.toLowerCase() === pythAsMoveToken.symbol.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        // Update existing token with Pyth data
        mergedTokens[existingIndex] = {
          ...mergedTokens[existingIndex],
          coinType: pythAsMoveToken.coinType,
          logoUrl: pythAsMoveToken.logoUrl || mergedTokens[existingIndex].logoUrl,
        };
      } else {
        // Add new token from Pyth
        mergedTokens.push(pythAsMoveToken);
      }
    }
    
    cachedTokens = mergedTokens;
    cacheTimestamp = now;
    return cachedTokens;
  } catch (error) {
    console.error("Failed to fetch Movement tokens:", error);
    
    // Fallback to Pyth tokens only
    if (!cachedTokens) {
      cachedTokens = pythTokens.map(pythToMovementToken);
      cacheTimestamp = now;
    }
    
    return cachedTokens;
  }
}

export async function getTokenByAddress(address: string): Promise<MovementToken | undefined> {
  const tokens = await getMovementTokens();
  
  // Normalize: replace @ with 0x, or add 0x if missing
  let normalizedAddress = address.toLowerCase().trim();
  if (normalizedAddress.startsWith("@")) {
    normalizedAddress = "0x" + normalizedAddress.slice(1);
  } else if (!normalizedAddress.startsWith("0x") && /^[a-f0-9]+$/.test(normalizedAddress)) {
    normalizedAddress = "0x" + normalizedAddress;
  }
  
  return tokens.find(
    (t) =>
      t.faAddress.toLowerCase() === normalizedAddress ||
      t.coinType?.toLowerCase() === normalizedAddress
  );
}

export async function getTokenBySymbol(symbol: string): Promise<MovementToken | undefined> {
  const tokens = await getMovementTokens();
  return tokens.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
}

export function isValidMovementToken(address: string, tokens: MovementToken[]): boolean {
  // Normalize: replace @ with 0x, or add 0x if missing
  let normalizedAddress = address.toLowerCase().trim();
  if (normalizedAddress.startsWith("@")) {
    normalizedAddress = "0x" + normalizedAddress.slice(1);
  } else if (!normalizedAddress.startsWith("0x") && /^[a-f0-9]+$/.test(normalizedAddress)) {
    normalizedAddress = "0x" + normalizedAddress;
  }
  
  return tokens.some(
    (t) =>
      t.faAddress.toLowerCase() === normalizedAddress ||
      t.coinType?.toLowerCase() === normalizedAddress
  );
}

// Get Pyth token data with price feed ID
export function getPythTokenData(): PythTokenData[] {
  return pythTokens;
}

export function getPythTokenBySymbol(symbol: string): PythTokenData | undefined {
  return pythTokens.find(
    (t) =>
      t.assetName.toLowerCase() === symbol.toLowerCase() ||
      t.displayName.toLowerCase() === symbol.toLowerCase()
  );
}
