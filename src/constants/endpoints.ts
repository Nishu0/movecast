export const URL_ENDPOINTS = {
    GOOGLE_AUTH_URL: "https://accounts.google.com/o/oauth2/v2/auth",
    GOOGLE_FETCH_USER_INFO_URL: "https://www.googleapis.com/oauth2/v3/userinfo",
    GOOGLE_TOKEN_URL: "https://oauth2.googleapis.com/token",
    // Use local backend for development
    MOVECAST_API_URL: "http://localhost:8787/api",
    MOVECAST_API_URL_LOCAL: "http://localhost:8787/api",
  } as const;