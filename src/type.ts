export interface BackendAuthResponse {
    token?: string;
    message?: string;
}

export interface PortfolioToken {
    address: string;
    decimals: number;
    balance: number;
    uiAmount: number;
    chainId: string;
    name: string;
    symbol: string;
    icon?: string;
    logoURI: string;
    priceUsd: number;
    valueUsd: number;
}

export interface TokenInfo {
    name: string;
    decimals: number;
    symbol: string;
    address: string | number;
    marketCap: number;
    fdv: number;
    price: number;
    holder: number;
    website?: string;
    twitter?: string;
    image?: string;
    liquidity: number;
    priceChange: {
      "1 minute": number;
      "1 hour": number;
      "6 hours": number;
      "30 minutes": number;
      "12 hours": number;
      "24 hours": number;
    };
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

  export type NetworkType = "testnet" | "mainnet" | "devnet";