import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { OAuth2Client } from "google-auth-library";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "522502425455-u35q72asou4le2jdvcanug9esle4au0v.apps.googleusercontent.com";
const JWT_SECRET = process.env.JWT_SECRET || "movecast-secret-key-change-in-production";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
    })
  )
  .use(bearer())
  .post("/callback", async ({ bearer, jwt, set }) => {
    if (!bearer) {
      set.status = 401;
      return { message: "Missing authorization token" };
    }

    try {
      // Verify the Google ID token
      const ticket = await googleClient.verifyIdToken({
        idToken: bearer,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        set.status = 401;
        return { message: "Invalid Google token" };
      }

      // Create our own session token
      const token = await jwt.sign({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      });

      return { token };
    } catch (error) {
      console.error("Auth error:", error);
      set.status = 401;
      return { message: "Authentication failed" };
    }
  })
  .get("/me", async ({ bearer, jwt, set }) => {
    if (!bearer) {
      set.status = 401;
      return { status: "error", message: "Missing authorization header" };
    }

    try {
      const user = await jwt.verify(bearer);
      if (!user) {
        set.status = 401;
        return { status: "error", message: "Invalid or expired token" };
      }
      return { status: "success", data: user };
    } catch {
      set.status = 401;
      return { status: "error", message: "Invalid or expired token" };
    }
  });

// Auth middleware for protected routes
export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .use(
    jwt({
      name: "jwt",
      secret: JWT_SECRET,
    })
  )
  .use(bearer())
  .derive(async ({ bearer, jwt, set }) => {
    console.log("=== AUTH MIDDLEWARE ===");
    console.log("Bearer token:", bearer ? `${bearer.substring(0, 50)}...` : "null");
    
    if (!bearer) {
      set.status = 401;
      return { user: null as Record<string, unknown> | null, authError: "Missing authorization header" as string | null };
    }

    try {
      const user = await jwt.verify(bearer);
      console.log("JWT verify result:", user ? "valid" : "null");
      if (!user) {
        set.status = 401;
        return { user: null as Record<string, unknown> | null, authError: "Invalid or expired token" as string | null };
      }
      return { user: user as Record<string, unknown>, authError: null as string | null };
    } catch (error) {
      console.error("JWT verify error:", error);
      set.status = 401;
      return { user: null as Record<string, unknown> | null, authError: "Invalid or expired token" as string | null };
    }
  });
