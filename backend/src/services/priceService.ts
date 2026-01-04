import QuickChart from "quickchart-js";
import { PriceHistory, PriceHistoryItem, MovementToken, PriceChange, PriceRecord, TokenInfo, PythTokenData } from "../types";
import { getMovementTokens, getTokenByAddress } from "./movementTokens";
import { hermesPythClient } from "../lib/pyth";
import tokenData from "../../token.json";

// Cast token data with proper typing
const pythTokens: PythTokenData[] = tokenData as PythTokenData[];

// Store price history for each token
interface TokenPriceStore {
  [address: string]: PriceRecord[];
}

const priceStore: TokenPriceStore = {};
const MAX_HISTORY_ITEMS = 1500; // ~24 hours of per-minute data

// Cache for Pyth prices
interface PythPriceCache {
  prices: Map<string, number>;
  lastFetch: number;
}

const pythCache: PythPriceCache = {
  prices: new Map(),
  lastFetch: 0,
};

const PYTH_CACHE_DURATION = 10 * 1000; // 10 seconds cache

// CoinGecko market data cache
interface CoinGeckoMarketData {
  marketCap: number;
  fdv: number;
  totalVolume: number;
  circulatingSupply: number;
  totalSupply: number;
  priceChange24h: number;
  lastUpdated: number;
}

interface CoinGeckoCache {
  data: Map<string, CoinGeckoMarketData>;
  lastFetch: number;
}

const coingeckoCache: CoinGeckoCache = {
  data: new Map(),
  lastFetch: 0,
};

const COINGECKO_CACHE_DURATION = 60 * 1000; // 1 minute cache (CoinGecko rate limits)

// Get Pyth token data by address or symbol
function getPythTokenByAddress(address: string): PythTokenData | undefined {
  // Normalize address for comparison
  const normalizedAddress = address.toLowerCase().replace(/^@/, "0x");
  
  return pythTokens.find((t) => {
    const tokenType = t.type.toLowerCase();
    const tokenFa = t.faAddress?.toLowerCase().replace(/^@/, "0x") || "";
    return tokenType === normalizedAddress || tokenFa === normalizedAddress;
  });
}

function getPythTokenBySymbol(symbol: string): PythTokenData | undefined {
  return pythTokens.find(
    (t) => t.assetName.toLowerCase() === symbol.toLowerCase() ||
           t.displayName.toLowerCase() === symbol.toLowerCase()
  );
}

// Fetch market data from CoinGecko
async function fetchCoinGeckoMarketData(): Promise<Map<string, CoinGeckoMarketData>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (coingeckoCache.data.size > 0 && now - coingeckoCache.lastFetch < COINGECKO_CACHE_DURATION) {
    return coingeckoCache.data;
  }

  try {
    // Get all CoinGecko IDs from token data
    const coingeckoIds = pythTokens
      .filter((item) => item.coingeckoId && item.coingeckoId.length > 0)
      .map((item) => item.coingeckoId as string);

    if (coingeckoIds.length === 0) {
      console.warn("No CoinGecko IDs found");
      return coingeckoCache.data;
    }

    const idsParam = coingeckoIds.join(",");
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      return coingeckoCache.data;
    }

    const data = await response.json() as Array<{
      id: string;
      market_cap: number | null;
      fully_diluted_valuation: number | null;
      total_volume: number | null;
      circulating_supply: number | null;
      total_supply: number | null;
      price_change_percentage_24h: number | null;
    }>;

    const newData = new Map<string, CoinGeckoMarketData>();

    for (const coin of data) {
      newData.set(coin.id, {
        marketCap: coin.market_cap || 0,
        fdv: coin.fully_diluted_valuation || 0,
        totalVolume: coin.total_volume || 0,
        circulatingSupply: coin.circulating_supply || 0,
        totalSupply: coin.total_supply || 0,
        priceChange24h: coin.price_change_percentage_24h || 0,
        lastUpdated: now,
      });
    }

    // Update cache
    coingeckoCache.data = newData;
    coingeckoCache.lastFetch = now;

    console.log(`Fetched market data for ${newData.size} tokens from CoinGecko`);
    return newData;
  } catch (error) {
    console.error("Error fetching CoinGecko market data:", error);
    return coingeckoCache.data;
  }
}

// Get market data for a specific token
async function getMarketData(coingeckoId: string | undefined): Promise<CoinGeckoMarketData | null> {
  if (!coingeckoId || coingeckoId.length === 0) {
    return null;
  }

  try {
    const marketData = await fetchCoinGeckoMarketData();
    return marketData.get(coingeckoId) || null;
  } catch (error) {
    console.error(`Error getting market data for ${coingeckoId}:`, error);
    return null;
  }
}

// Fetch all prices from Pyth network
async function fetchPythPrices(): Promise<Map<string, number>> {
  const now = Date.now();
  
  // Return cached prices if still valid
  if (pythCache.prices.size > 0 && now - pythCache.lastFetch < PYTH_CACHE_DURATION) {
    return pythCache.prices;
  }

  try {
    // Get all Pyth IDs from token data
    const priceFeedIds = pythTokens
      .filter((item) => item.pythId)
      .map((item) => item.pythId);

    if (priceFeedIds.length === 0) {
      console.warn("No Pyth price feed IDs found");
      return pythCache.prices;
    }

    // Fetch latest prices from Pyth Hermes
    const priceUpdates = await hermesPythClient.getLatestPriceUpdates(priceFeedIds);

    if (!priceUpdates || !priceUpdates.parsed) {
      console.error("Failed to fetch Pyth price feeds");
      return pythCache.prices;
    }

    const newPrices = new Map<string, number>();

    for (const feed of priceUpdates.parsed) {
      const price = feed.price;
      if (price) {
        // Calculate actual price: price * 10^expo
        const actualPrice = Number(price.price) * Math.pow(10, price.expo);
        newPrices.set(feed.id, actualPrice);
      }
    }

    // Update cache
    pythCache.prices = newPrices;
    pythCache.lastFetch = now;

    console.log(`Fetched ${newPrices.size} prices from Pyth network`);
    return newPrices;
  } catch (error) {
    console.error("Error fetching Pyth prices:", error);
    // Return cached prices on error
    return pythCache.prices;
  }
}

// Get price for a specific token from Pyth
async function getPythPrice(pythId: string): Promise<number | null> {
  try {
    const prices = await fetchPythPrices();
    
    // Pyth IDs in the response don't have 0x prefix
    const normalizedId = pythId.replace(/^0x/, "");
    
    // Check both with and without prefix
    const price = prices.get(normalizedId) || prices.get(pythId);
    return price ?? null;
  } catch (error) {
    console.error(`Error getting Pyth price for ${pythId}:`, error);
    return null;
  }
}

// Store price in history
function recordPrice(address: string, price: number): void {
  const key = address.toLowerCase();
  
  if (!priceStore[key]) {
    priceStore[key] = [];
  }
  
  const now = Date.now();
  const history = priceStore[key];
  const lastRecord = history[history.length - 1];
  
  // Only add new record if at least 10 seconds have passed
  if (!lastRecord || now - lastRecord.timestamp > 10000) {
    history.push({ price, timestamp: now });
    
    // Trim old history
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(0, history.length - MAX_HISTORY_ITEMS);
    }
  }
}

// Calculate price change percentage over a time period
function calculatePriceChange(history: PriceRecord[], currentPrice: number, minutesAgo: number): number {
  if (history.length === 0) return 0;
  
  const now = Date.now();
  const targetTime = now - minutesAgo * 60 * 1000;
  
  // Find the closest price record to the target time
  let closestRecord: PriceRecord | null = null;
  let closestDiff = Infinity;
  
  for (const record of history) {
    const diff = Math.abs(record.timestamp - targetTime);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestRecord = record;
    }
  }
  
  if (!closestRecord || closestRecord.price === 0) {
    return 0;
  }
  
  return ((currentPrice - closestRecord.price) / closestRecord.price) * 100;
}

// Get actual price changes based on historical data
export function getPriceChanges(address: string, currentPrice: number): PriceChange {
  const key = address.toLowerCase();
  const history = priceStore[key] || [];
  
  return {
    "1 minute": calculatePriceChange(history, currentPrice, 1),
    "30 minutes": calculatePriceChange(history, currentPrice, 30),
    "1 hour": calculatePriceChange(history, currentPrice, 60),
    "6 hours": calculatePriceChange(history, currentPrice, 360),
    "12 hours": calculatePriceChange(history, currentPrice, 720),
    "24 hours": calculatePriceChange(history, currentPrice, 1440),
  };
}

// Get current price for a token - uses Pyth for real prices
export async function getCurrentPrice(address: string): Promise<number> {
  // First try to find in Pyth tokens
  let pythToken = getPythTokenByAddress(address);
  
  // If not found by address, try to get Movement token and match by symbol
  if (!pythToken) {
    const movementToken = await getTokenByAddress(address);
    if (movementToken) {
      pythToken = getPythTokenBySymbol(movementToken.symbol);
    }
  }
  
  if (pythToken && pythToken.pythId) {
    const pythPrice = await getPythPrice(pythToken.pythId);
    if (pythPrice !== null && pythPrice > 0) {
      // Record the price for history tracking
      recordPrice(address, pythPrice);
      return pythPrice;
    }
  }
  
  // Fallback: check if we have cached history
  const key = address.toLowerCase();
  const history = priceStore[key];
  if (history && history.length > 0) {
    return history[history.length - 1].price;
  }
  
  throw new Error(`Unable to fetch price for token: ${address}`);
}

// Build complete TokenInfo with actual Pyth prices and CoinGecko market data
export async function getTokenInfo(token: MovementToken): Promise<TokenInfo> {
  const price = await getCurrentPrice(token.faAddress);
  const priceChanges = getPriceChanges(token.faAddress, price);
  
  // Get additional data from Pyth token if available
  const pythToken = getPythTokenBySymbol(token.symbol);
  
  // Fetch dynamic market data from CoinGecko
  const marketData = await getMarketData(pythToken?.coingeckoId);
  
  let marketCap: number;
  let fdv: number;
  let liquidity: number;
  let holders: number;
  
  if (marketData) {
    // Use real CoinGecko data
    marketCap = marketData.marketCap;
    fdv = marketData.fdv || marketCap;
    liquidity = marketData.totalVolume; // Using 24h volume as liquidity proxy
    
    // Estimate holders based on market cap (rough approximation)
    // Real holder count would require on-chain data
    if (marketCap > 1_000_000_000) {
      holders = Math.floor(marketCap / 10000); // ~100k holders per $1B
    } else if (marketCap > 100_000_000) {
      holders = Math.floor(marketCap / 5000); // ~20k holders per $100M
    } else {
      holders = Math.floor(marketCap / 1000) + 1000; // Minimum ~1k holders
    }
    
    // Use 24h price change from CoinGecko if our tracked data is insufficient
    if (priceChanges["24 hours"] === 0 && marketData.priceChange24h !== 0) {
      priceChanges["24 hours"] = marketData.priceChange24h;
    }
  } else {
    // Fallback: estimate based on current price and token type
    if (token.symbol === "MOVE") {
      marketCap = price * 10_000_000_000; // 10B supply estimate
      fdv = price * 10_000_000_000;
      liquidity = 50_000_000;
      holders = 150000;
    } else if (token.symbol.includes("USD")) {
      marketCap = 1_000_000_000;
      fdv = 1_000_000_000;
      liquidity = 100_000_000;
      holders = 50000;
    } else if (token.symbol.includes("BTC")) {
      marketCap = price * 21_000_000;
      fdv = price * 21_000_000;
      liquidity = 10_000_000;
      holders = 25000;
    } else if (token.symbol.includes("ETH")) {
      marketCap = price * 120_000_000;
      fdv = price * 120_000_000;
      liquidity = 20_000_000;
      holders = 30000;
    } else {
      marketCap = price * 1_000_000_000;
      fdv = price * 1_500_000_000;
      liquidity = price * 10_000_000;
      holders = 10000;
    }
  }
  
  return {
    name: token.name,
    decimals: token.decimals,
    symbol: token.symbol,
    address: token.faAddress,
    marketCap,
    fdv,
    price,
    holder: holders,
    image: pythToken?.icon || token.logoUrl,
    liquidity,
    priceChange: priceChanges,
  };
}

// Generate price history from stored data
function getPriceHistoryData(
  address: string,
  timeFrom: number,
  timeTo: number,
  timeInterval: string
): PriceHistoryItem[] {
  const key = address.toLowerCase();
  const history = priceStore[key] || [];
  const items: PriceHistoryItem[] = [];
  const intervalMs = parseInterval(timeInterval);
  
  const fromMs = timeFrom * 1000;
  const toMs = timeTo * 1000;
  
  // Sample from actual history
  for (let time = fromMs; time <= toMs; time += intervalMs) {
    // Find closest historical record
    let closestRecord: PriceRecord | null = null;
    let closestDiff = Infinity;
    
    for (const record of history) {
      const diff = Math.abs(record.timestamp - time);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestRecord = record;
      }
    }
    
    if (closestRecord) {
      items.push({
        unixTime: Math.floor(time / 1000),
        value: closestRecord.price,
      });
    }
  }
  
  return items;
}

function parseInterval(interval: string): number {
  const value = parseInt(interval) || 1;
  const unit = interval.replace(/\d/g, "").toLowerCase();

  switch (unit) {
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000; // Default 1 hour
  }
}

async function generateChartUrl(items: PriceHistoryItem[], symbol: string): Promise<string> {
  if (items.length === 0) {
    return "";
  }

  const chart = new QuickChart();

  // Limit labels for readability
  const step = Math.max(1, Math.floor(items.length / 10));
  const labels = items.map((item, i) => {
    if (i % step === 0) {
      const date = new Date(item.unixTime * 1000);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit" });
    }
    return "";
  });

  const data = items.map((item) => item.value);

  // Determine if price is up or down
  const isUp = data.length > 1 && data[data.length - 1] >= data[0];
  const lineColor = isUp ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)";
  const bgColor = isUp ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)";

  chart.setConfig({
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${symbol} Price`,
          data,
          fill: true,
          borderColor: lineColor,
          backgroundColor: bgColor,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false,
          },
        },
        y: {
          display: true,
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
    },
  });

  chart.setWidth(800);
  chart.setHeight(400);
  chart.setBackgroundColor("#1a1a2e");

  return chart.getUrl();
}

export async function getPriceHistory(
  address: string,
  timeFrom: number,
  timeTo: number,
  timeInterval: string
): Promise<PriceHistory> {
  const token = await getTokenByAddress(address);

  if (!token) {
    throw new Error("Token not found in Movement Labs token list");
  }

  // First, fetch current price to ensure we have latest data
  await getCurrentPrice(address);

  const items = getPriceHistoryData(address, timeFrom, timeTo, timeInterval);
  const chartImageUrl = await generateChartUrl(items, token.symbol);

  return {
    items,
    chartImageUrl,
  };
}

export async function getAllTokenPrices(): Promise<{ token: MovementToken; price: number }[]> {
  // Prefetch all Pyth prices and CoinGecko market data
  await Promise.all([
    fetchPythPrices(),
    fetchCoinGeckoMarketData(),
  ]);
  
  const tokens = await getMovementTokens();
  const result: { token: MovementToken; price: number }[] = [];

  for (const token of tokens) {
    try {
      const price = await getCurrentPrice(token.faAddress);
      result.push({ token, price });
    } catch (error) {
      console.error(`Failed to get price for ${token.symbol}:`, error);
    }
  }

  return result;
}

// Initialize prices on startup - fetch and store initial prices
export async function initializePrices(): Promise<void> {
  console.log("Initializing price feeds...");
  try {
    // Fetch both Pyth prices and CoinGecko market data in parallel
    const [prices, marketData] = await Promise.all([
      fetchPythPrices(),
      fetchCoinGeckoMarketData(),
    ]);
    
    console.log(`Initialized ${prices.size} price feeds from Pyth network`);
    console.log(`Initialized ${marketData.size} market data entries from CoinGecko`);
    
    // Store initial prices for all tokens
    for (const pythToken of pythTokens) {
      if (pythToken.pythId) {
        const normalizedId = pythToken.pythId.replace(/^0x/, "");
        const price = prices.get(normalizedId) || prices.get(pythToken.pythId);
        if (price) {
          const address = pythToken.faAddress?.replace(/^@/, "0x") || pythToken.type;
          recordPrice(address, price);
          
          // Get market data if available
          const cgData = marketData.get(pythToken.coingeckoId || "");
          const mcapInfo = cgData ? ` | MCap: $${(cgData.marketCap / 1e9).toFixed(2)}B` : "";
          console.log(`  ${pythToken.displayName}: $${price.toFixed(4)}${mcapInfo}`);
        }
      }
    }
  } catch (error) {
    console.error("Failed to initialize prices:", error);
  }
}

// Get all available Pyth tokens
export function getAvailablePythTokens(): PythTokenData[] {
  return pythTokens;
}
