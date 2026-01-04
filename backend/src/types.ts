export interface MovementToken {
  faAddress: string;
  coinType?: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl: string;
}

export interface PriceChange {
  "1 minute": number;
  "1 hour": number;
  "6 hours": number;
  "30 minutes": number;
  "12 hours": number;
  "24 hours": number;
}

export interface TokenInfo {
  name: string;
  decimals: number;
  symbol: string;
  address: string;
  marketCap: number;
  fdv: number;
  price: number;
  holder: number;
  website?: string;
  twitter?: string;
  image?: string;
  liquidity: number;
  priceChange: PriceChange;
}

export interface PriceHistoryItem {
  unixTime: number;
  value: number;
}

export interface PriceHistory {
  items: PriceHistoryItem[];
  chartImageUrl: string;
  message?: string;
}

export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  data?: T;
  message?: string;
}

export interface UserPayload {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

// Price record for historical tracking
export interface PriceRecord {
  price: number;
  timestamp: number;
}

export interface TokenPriceHistory {
  current: PriceRecord;
  history: PriceRecord[];
}

// Token data from token.json with Pyth IDs
export interface PythTokenData {
  assetName: string;
  type: string;
  provider: string;
  displayName: string;
  pythId: string;
  ltv: number;
  faAddress: string | null;
  efficiencyMode: number;
  efficiencyLtv: number;
  icon: string;
  decimals: number;
  liquidationFactor: number;
  efficientLiquidationFactor: number;
  source?: string;
  isFungible: boolean;
  coingeckoId?: string;
  resource?: string;
}

// Pyth price feed data
export interface PythPriceData {
  id: string;
  price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
  ema_price: {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
  };
}
