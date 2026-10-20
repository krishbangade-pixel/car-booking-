import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config/env.js";
import apiRoutes from "./routes/api.js";

export const app = express();

// Security Headers
app.use(helmet());

// CORS configuration (allow Next.js frontend)
app.use(
  cors({
    origin: [config.clientUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-demo-user-id", "x-demo-role"],
  })
);

// Rate Limiter
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "TooManyRequests",
    message: "Rate limit exceeded, please try again later.",
  },
});
app.use("/api/", limiter);

// JSON Body Parser (Webhook routes can use raw buffer if needed)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use("/api", apiRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "NotFound",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isProd = config.nodeEnv === "production";

  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  res.status(status).json({
    success: false,
    error: err.name || "ServerError",
    message: err.message || "An unexpected internal server error occurred",
    ...(isProd ? {} : { stack: err.stack }),
  });
});
