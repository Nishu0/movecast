import axios from "axios";

export const STORAGE_KEYS = {
  BACKEND_SESSION_TOKEN: "backendSessionToken", // Example: Store token from your backend
  PKCE_VERIFIER: "googlePkceVerifier", // Temporary
  STATE: "googleAuthState", // Temporary
};

export const BASE_BACKEND_URL = "http://localhost:8787/api";
export const BACKEND_CALLBACK_URL = "http://localhost:8787/api/auth/callback";

export const backendClient = axios.create({
  baseURL: BASE_BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Display formatting
export const ADDRESS_TRUNCATE_START = 8;
export const ADDRESS_TRUNCATE_END = 6;
export const EXPLORER_BASE_URL = "https://explorer.movementnetwork.xyz";
export const DEFAULT_NETWORK = "mainnet" as const;