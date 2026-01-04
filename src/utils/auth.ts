import { LocalStorage, OAuth } from "@raycast/api";
import { BackendAuthResponse } from "../type";
import { BACKEND_CALLBACK_URL, STORAGE_KEYS } from "./constants";
import { CacheAdapter } from "./cache";
import { URL_ENDPOINTS } from "../constants/endpoints";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "MoveCast",
  providerIcon: "icon.png",
  providerId: "google",
  description: "Connect your Google account to MoveCast\n(Wallet powered by Privy)",
});

// Google OAuth credentials - replace with your own
const GOOGLE_CLIENT_ID = "522502425455-u35q72asou4le2jdvcanug9esle4au0v.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = ""; // Get from Google Cloud Console

export const provider = {
  client,
  authorize: async () => {
    console.log("=== AUTHORIZE CALLED ===");
    
    // First, check if we have existing tokens
    const currentTokenSet = await client.getTokens();
    console.log("Current token set:", currentTokenSet ? "exists" : "null", "expired:", currentTokenSet?.isExpired?.());

    if (currentTokenSet?.accessToken) {
      // If we have a refresh token and the access token is expired, try to refresh
      if (currentTokenSet.refreshToken && currentTokenSet.isExpired()) {
        try {
          const tokens = await refreshTokens(currentTokenSet.refreshToken);
          await client.setTokens(tokens);
          // After refreshing Google tokens, fetch new backend token
          return await fetchBackendToken(tokens.id_token || "");
        } catch (error) {
          console.error("Failed to refresh tokens:", error);
          // If refresh fails, remove tokens and continue with new auth flow
          await client.removeTokens();
        }
      } else if (!currentTokenSet.isExpired()) {
        // Token is still valid - always fetch a fresh backend token to ensure it's valid
        // This handles cases where the backend JWT secret changed or token expired
        try {
          return await fetchBackendToken(currentTokenSet.idToken || "");
        } catch (error) {
          console.error("Failed to fetch backend token with valid Google token:", error);
          // If backend token fetch fails, clear tokens and force re-auth
          await client.removeTokens();
          await LocalStorage.removeItem(STORAGE_KEYS.BACKEND_SESSION_TOKEN);
        }
      }
    }

    // No valid tokens, start new auth flow
    const authRequest = await client.authorizationRequest({
      endpoint: URL_ENDPOINTS.GOOGLE_AUTH_URL,
      clientId: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    });

    const { authorizationCode } = await client.authorize(authRequest);
    const tokens = await fetchTokens(authRequest, authorizationCode);
    await client.setTokens(tokens);
    return await fetchBackendToken(tokens.id_token || "");
  },
  refreshToken: async (refreshToken: string) => {
    const tokens = await refreshTokens(refreshToken);
    await client.setTokens(tokens);
    return await fetchBackendToken(tokens.id_token || "");
  },
  getTokens: async () => {
    const tokens = await client.getTokens();
    return tokens;
  },
  signOut: async () => {
    await client.removeTokens();
    await LocalStorage.removeItem(STORAGE_KEYS.BACKEND_SESSION_TOKEN);

    // Clear all cached data
    const cache = new CacheAdapter("temp"); // Create a temporary instance to access the cache
    cache.clear();
  },
};

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", GOOGLE_CLIENT_ID);
  params.append("client_secret", GOOGLE_CLIENT_SECRET);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(URL_ENDPOINTS.GOOGLE_TOKEN_URL, { method: "POST", body: params });
  if (!response.ok) {
    const responseText = await response.text();
    console.error("fetch tokens error:", responseText);
    throw new Error(`Error while fetching tokens: ${response.status} (${response.statusText})\n${responseText}`);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  return tokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", GOOGLE_CLIENT_ID);
  params.append("client_secret", GOOGLE_CLIENT_SECRET);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(URL_ENDPOINTS.GOOGLE_TOKEN_URL, { method: "POST", body: params });
  if (!response.ok) {
    const responseText = await response.text();
    console.error("refresh tokens error:", responseText);
    // If refresh fails, throw error to trigger re-authorization
    throw new Error(`Error while refreshing tokens: ${response.status} (${response.statusText})\n${responseText}`);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

async function fetchBackendToken(googleIdToken: string): Promise<string> {
  console.log("=== FETCHING BACKEND TOKEN ===");
  console.log("Google ID token length:", googleIdToken?.length || 0);
  console.log("Calling:", BACKEND_CALLBACK_URL);
  
  const res = await fetch(BACKEND_CALLBACK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${googleIdToken}`,
    },
  });
  
  console.log("Backend response status:", res.status);
  const data = (await res.json()) as BackendAuthResponse;
  console.log("Backend response:", JSON.stringify(data));
  
  if (!data.token) {
    throw new Error("Error fetching backend token: " + JSON.stringify(data));
  }
  await LocalStorage.setItem(STORAGE_KEYS.BACKEND_SESSION_TOKEN, data.token);
  console.log("Backend token saved!");
  return data.token;
}
