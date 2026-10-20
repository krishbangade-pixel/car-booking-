import { createClerkClient } from "@clerk/backend";
import { config } from "../config/env.js";
import { supabase } from "../config/database.js";

// Initialize official Clerk backend client if secret key is provided
export const clerkClient = config.clerk.secretKey
  ? createClerkClient({ secretKey: config.clerk.secretKey })
  : null;

/**
 * Supabase & Clerk Authentication Middleware
 * Validates session token from Authorization: Bearer <token>
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const demoUserId = req.headers["x-demo-user-id"];
    const demoRole = String(req.headers["x-demo-role"] || "rider").toLowerCase();

    const applyDemoUser = () => {
      req.user = {
        id: demoUserId || "demo_user_1",
        email: req.headers["x-demo-email"] || "krish.bangade@example.com",
        fullName: req.headers["x-demo-name"] || "Krish Bangade",
        role: demoRole === "driver" ? "driver" : demoRole === "admin" ? "admin" : "rider",
      };
      return next();
    };

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (process.env.NODE_ENV !== "production" && demoUserId) {
        return applyDemoUser();
      }

      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    if (process.env.NODE_ENV !== "production" && (token === "mock_token" || token === "demo_token")) {
      if (demoUserId) {
        return applyDemoUser();
      }
    }

    // 1. Supabase Auth Token verification
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          const rawRole = user.user_metadata?.role || "customer";
          req.user = {
            id: user.id,
            email: user.email || "",
            fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            role: rawRole === "driver" ? "driver" : rawRole === "admin" ? "admin" : "rider",
          };
          return next();
        }
      } catch (sbErr) {
        // Fall through
      }
    }

    // 2. Clerk Token verification
    if (clerkClient) {
      try {
        const decoded = await clerkClient.verifyToken(token);
        const clerkUser = await clerkClient.users.getUser(decoded.sub);

        req.user = {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          fullName: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
          role: clerkUser.publicMetadata?.role || "rider",
        };
        return next();
      } catch (clerkErr) {
        // Fall through
      }
    }

    // 3. Bearer token provided but all verifiers failed — reject
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Provided token is invalid or expired",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "AuthenticationError",
      message: err.message,
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts endpoint to specific roles ('rider', 'driver', 'admin')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const userRole = String(req.user.role || "rider").toLowerCase();
    const normalizedAllowed = allowedRoles.map((role) => String(role).toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]`,
      });
    }

    next();
  };
}
