import { Request, Response, NextFunction } from "express";
import { authenticateToken } from "./auth";
import { validateHmacSignature, captureRawBody } from "./hmacAuth";
import winston from "winston";
import { config } from "../config";

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "flexible-auth" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: config.logging.files.combined,
    }),
  ],
});

/**
 * Flexible authentication middleware that supports both JWT and HMAC authentication
 * This allows endpoints to be accessed by both authenticated users (JWT) and bots (HMAC)
 */
export const flexibleAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Check if HMAC headers are present
  const hmacSignature = req.headers["x-signature"] as string;
  const hmacTimestamp = req.headers["x-timestamp"] as string;
  
  // Check if JWT header is present
  const jwtToken = req.headers.authorization;

  logger.debug("Flexible auth check", {
    hasHmacSignature: !!hmacSignature,
    hasHmacTimestamp: !!hmacTimestamp,
    hasJwtToken: !!jwtToken,
    path: req.path,
    method: req.method,
  });

  if (hmacSignature && hmacTimestamp) {
    // HMAC authentication path
    logger.debug("Attempting HMAC authentication", {
      path: req.path,
      method: req.method,
    });

    // Ensure raw body is captured for HMAC validation
    if (!req.rawBody) {
      captureRawBody(req, res, () => {
        validateHmacSignature(req, res, next);
      });
    } else {
      validateHmacSignature(req, res, next);
    }
  } else if (jwtToken) {
    // JWT authentication path
    logger.debug("Attempting JWT authentication", {
      path: req.path,
      method: req.method,
    });

    authenticateToken(req, res, next);
  } else {
    // No authentication headers present
    logger.warn("No authentication headers present", {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    res.status(401).json({
      success: false,
      message: "Authentication required. Provide either JWT token or HMAC signature.",
    });
  }
};

/**
 * Middleware to ensure raw body is captured for HMAC validation
 * This should be used before flexibleAuth for routes that might use HMAC
 */
export const ensureRawBodyForHmac = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const hmacSignature = req.headers["x-signature"] as string;
  
  if (hmacSignature && !req.rawBody) {
    captureRawBody(req, res, next);
  } else {
    next();
  }
};

/**
 * Middleware that requires JWT authentication specifically
 * Use this for user-specific endpoints that should not be accessible via HMAC
 */
export const requireJwtAuth = authenticateToken;

/**
 * Middleware that requires HMAC authentication specifically
 * Use this for bot-specific endpoints that should not be accessible via JWT
 */
export const requireHmacAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Ensure raw body is captured
  if (!req.rawBody) {
    captureRawBody(req, res, () => {
      validateHmacSignature(req, res, next);
    });
  } else {
    validateHmacSignature(req, res, next);
  }
};

/**
 * Check if the current request is authenticated via HMAC
 */
export const isHmacAuthenticated = (req: Request): boolean => {
  const hmacSignature = req.headers["x-signature"] as string;
  const hmacTimestamp = req.headers["x-timestamp"] as string;
  
  return !!(hmacSignature && hmacTimestamp);
};

/**
 * Check if the current request is authenticated via JWT
 */
export const isJwtAuthenticated = (req: Request): boolean => {
  return !!req.user;
};

/**
 * Get authentication type for the current request
 */
export const getAuthenticationType = (req: Request): "jwt" | "hmac" | "none" => {
  if (isJwtAuthenticated(req)) {
    return "jwt";
  } else if (isHmacAuthenticated(req)) {
    return "hmac";
  } else {
    return "none";
  }
}; 