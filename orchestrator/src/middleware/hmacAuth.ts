import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config";

// Extend Express Request interface to include raw body
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * HMAC Authentication Middleware
 * Validates HMAC-SHA256 signatures for secure API endpoints
 */
export const validateHmacSignature = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const signature = req.headers["x-signature"] as string;
    const timestamp = req.headers["x-timestamp"] as string;

    if (!signature || !timestamp) {
      res.status(401).json({
        success: false,
        message: "Missing required headers: x-signature and x-timestamp",
      });
      return;
    }

    // Check timestamp to prevent replay attacks (5 minute window)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - requestTime);
    const maxTimeDiff = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (timeDiff > maxTimeDiff) {
      res.status(401).json({
        success: false,
        message: "Request timestamp too old or in future",
      });
      return;
    }

    // Get request body
    const body = req.rawBody || Buffer.from(JSON.stringify(req.body));

    // Create message to sign: method + url + timestamp + body
    const message = `${req.method}${req.originalUrl}${timestamp}${body.toString()}`;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", config.security.hmacSecret)
      .update(message)
      .digest("hex");

    // Compare signatures (constant-time comparison)
    const providedSignature = signature.replace("sha256=", "");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "hex"),
        Buffer.from(providedSignature, "hex"),
      )
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid HMAC signature",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "HMAC validation failed",
    });
  }
};

/**
 * Middleware to capture raw request body for HMAC validation
 */
export const captureRawBody = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let data = "";

  req.on("data", (chunk) => {
    data += chunk;
  });

  req.on("end", () => {
    req.rawBody = Buffer.from(data);
    next();
  });
};

/**
 * Utility function to generate HMAC signature for testing
 */
export const generateHmacSignature = (
  method: string,
  url: string,
  timestamp: string,
  body: string,
  secret: string,
): string => {
  const message = `${method}${url}${timestamp}${body}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
};
