import jwt from "jsonwebtoken";
import crypto from "crypto";
import winston from "winston";
import { IUser } from "../models/User";
import { config } from "../config";

// Configure logger for auth utilities
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "auth-utils" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({
      filename: "logs/auth-error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: config.logging.files.auth,
    }),
  ],
});

export interface JWTPayload {
  userId: string;
  telegramId: string;
  username: string;
}

export interface TelegramAuthData {
  chatId: string;
  user: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  };
  auth_date?: number;
  hash?: string;
}

export class AuthUtils {
  private static readonly JWT_SECRET = config.auth.jwtSecret;
  private static readonly JWT_EXPIRES_IN = config.auth.jwtExpiresIn;
  private static readonly TELEGRAM_BOT_TOKEN = config.telegram.botToken;

  /**
   * Generate JWT token for authenticated user
   */
  static generateToken(user: IUser): string {
    try {
      logger.info("Generating JWT token", {
        userId: user._id.toString(),
        telegramId: user.telegramId,
        username: user.username,
      });

      const payload: JWTPayload = {
        userId: user._id.toString(),
        telegramId: user.telegramId,
        username: user.username,
      };

      const token = jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: this.JWT_EXPIRES_IN,
      } as jwt.SignOptions);

      logger.info("JWT token generated successfully", {
        userId: user._id.toString(),
        expiresIn: this.JWT_EXPIRES_IN,
      });

      return token;
    } catch (error) {
      logger.error("Failed to generate JWT token", {
        userId: user._id?.toString(),
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Verify JWT token and return payload
   */
  static verifyToken(token: string): JWTPayload {
    try {
      logger.debug("Verifying JWT token", {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + "...",
      });

      const payload = jwt.verify(token, this.JWT_SECRET) as JWTPayload;

      logger.debug("JWT token verified successfully", {
        userId: payload.userId,
        telegramId: payload.telegramId,
        username: payload.username,
      });

      return payload;
    } catch (error) {
      logger.warn("JWT token verification failed", {
        tokenLength: token.length,
        error: error instanceof Error ? error.message : "Unknown error",
        errorType:
          error instanceof jwt.JsonWebTokenError
            ? error.constructor.name
            : "Unknown",
      });
      throw error;
    }
  }

  /**
   * Validate Telegram authentication data
   * This can be enhanced based on your specific validation requirements
   */
  static validateTelegramAuthData(authData: TelegramAuthData): boolean {
    try {
      logger.info("Validating Telegram auth data", {
        chatId: authData.chatId,
        userId: authData.user?.id,
        username: authData.user?.username,
        hasHash: !!authData.hash,
        hasAuthDate: !!authData.auth_date,
      });

      // Basic validation - ensure required fields are present
      if (
        !authData.chatId ||
        !authData.user ||
        !authData.user.id ||
        !authData.user.username
      ) {
        logger.warn(
          "Telegram auth data validation failed - missing required fields",
          {
            chatId: !!authData.chatId,
            user: !!authData.user,
            userId: !!authData.user?.id,
            username: !!authData.user?.username,
          },
        );
        return false;
      }

      // If hash is provided, validate it (implement your hash validation logic here)
      if (authData.hash && authData.auth_date) {
        logger.debug("Validating Telegram hash", {
          userId: authData.user.id,
          authDate: authData.auth_date,
        });

        const hashValid = this.validateTelegramHash(authData);

        logger.info("Telegram hash validation completed", {
          userId: authData.user.id,
          hashValid,
          authDate: authData.auth_date,
        });

        return hashValid;
      }

      // For now, return true if basic fields are present
      // You can add more sophisticated validation based on your bot's requirements
      logger.info(
        "Telegram auth data validation successful (basic validation)",
        {
          userId: authData.user.id,
          username: authData.user.username,
        },
      );

      return true;
    } catch (error) {
      logger.error("Telegram auth data validation error", {
        chatId: authData.chatId,
        userId: authData.user?.id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }

  /**
   * Validate Telegram hash (implement based on your bot's authentication method)
   */
  private static validateTelegramHash(authData: TelegramAuthData): boolean {
    try {
      logger.debug("Starting Telegram hash validation", {
        userId: authData.user.id,
        authDate: authData.auth_date,
        hasBotToken: !!this.TELEGRAM_BOT_TOKEN,
      });

      if (!this.TELEGRAM_BOT_TOKEN || !authData.hash || !authData.auth_date) {
        logger.warn("Telegram hash validation failed - missing required data", {
          hasBotToken: !!this.TELEGRAM_BOT_TOKEN,
          hasHash: !!authData.hash,
          hasAuthDate: !!authData.auth_date,
        });
        return false;
      }

      // Create data check string
      const userData = authData.user;
      const dataString = [
        `id=${userData.id}`,
        userData.username ? `username=${userData.username}` : "",
        userData.first_name ? `first_name=${userData.first_name}` : "",
        userData.last_name ? `last_name=${userData.last_name}` : "",
        userData.language_code ? `language_code=${userData.language_code}` : "",
        `auth_date=${authData.auth_date}`,
      ]
        .filter(Boolean)
        .sort()
        .join("\n");

      logger.debug("Telegram hash validation data string created", {
        userId: userData.id,
        dataStringLength: dataString.length,
        fieldsCount: dataString.split("\n").length,
      });

      // Create secret key
      const secretKey = crypto
        .createHash("sha256")
        .update(this.TELEGRAM_BOT_TOKEN)
        .digest();

      // Calculate hash
      const hmac = crypto.createHmac("sha256", secretKey);
      hmac.update(dataString);
      const calculatedHash = hmac.digest("hex");

      const hashMatches = calculatedHash === authData.hash;

      logger.info("Telegram hash validation completed", {
        userId: userData.id,
        hashMatches,
        providedHashLength: authData.hash.length,
        calculatedHashLength: calculatedHash.length,
      });

      if (!hashMatches) {
        logger.warn("Telegram hash mismatch", {
          userId: userData.id,
          providedHash: authData.hash.substring(0, 8) + "...",
          calculatedHash: calculatedHash.substring(0, 8) + "...",
        });
      }

      return hashMatches;
    } catch (error) {
      logger.error("Telegram hash validation error", {
        userId: authData.user?.id,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }

  /**
   * Extract user data from Telegram auth payload
   */
  static parseTelegramUserData(authData: TelegramAuthData): any {
    try {
      logger.debug("Parsing Telegram user data", {
        userId: authData.user?.id,
        username: authData.user?.username,
        chatId: authData.chatId,
      });

      const userData = {
        id: authData.user.id,
        username: authData.user.username,
        first_name: authData.user.first_name,
        last_name: authData.user.last_name,
        language_code: authData.user.language_code,
        chatId: authData.chatId,
      };

      logger.info("Telegram user data parsed successfully", {
        userId: userData.id,
        username: userData.username,
        hasFirstName: !!userData.first_name,
        hasLastName: !!userData.last_name,
        languageCode: userData.language_code,
      });

      return userData;
    } catch (error) {
      logger.error("Failed to parse Telegram user data", {
        chatId: authData.chatId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    try {
      logger.debug("Extracting token from Authorization header", {
        hasHeader: !!authHeader,
        headerLength: authHeader?.length,
      });

      if (!authHeader) {
        logger.warn("No Authorization header provided");
        return null;
      }

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        logger.warn("Invalid Authorization header format", {
          partsCount: parts.length,
          scheme: parts[0],
          hasToken: parts.length > 1 && !!parts[1],
        });
        return null;
      }

      const token = parts[1];

      logger.debug("Token extracted successfully from Authorization header", {
        tokenLength: token.length,
      });

      return token;
    } catch (error) {
      logger.error("Failed to extract token from Authorization header", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }
}
