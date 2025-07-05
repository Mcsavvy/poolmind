import swaggerJsdoc from "swagger-jsdoc";
import { config } from "../config";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PoolMind Orchestrator API",
      version: "1.0.0",
      description:
        "The central orchestrator for the PoolMind pooled crypto arbitrage fund platform.",
      contact: {
        name: "PoolMind Support",
        email: "support@poolmind.com",
      },
    },
    servers: [
      {
        url: config.server.appUrl,
        description: config.server.isDevelopment ? "Development server" : "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter JWT token",
        },
        hmacAuth: {
          type: "apiKey",
          in: "header",
          name: "x-signature",
          description:
            "HMAC-SHA256 signature in format: sha256=<signature>. Also requires x-timestamp header.",
        },
      },
      schemas: {
        // Request body schemas
        TelegramAuthRequest: {
          type: "object",
          required: ["chatId", "user"],
          properties: {
            chatId: {
              type: "string",
              description: "Telegram chat ID",
              example: "279058397",
            },
            user: {
              type: "object",
              required: ["id", "username"],
              properties: {
                id: {
                  type: "number",
                  description: "Telegram user ID",
                  example: 279058397,
                },
                username: {
                  type: "string",
                  description: "Telegram username",
                  example: "johndoe",
                },
                first_name: {
                  type: "string",
                  description: "User first name",
                  example: "John",
                },
                last_name: {
                  type: "string",
                  description: "User last name",
                  example: "Doe",
                },
                language_code: {
                  type: "string",
                  description: "User language code",
                  example: "en",
                },
              },
            },
            auth_date: {
              type: "number",
              description: "Authentication timestamp",
              example: 1662771648,
            },
            hash: {
              type: "string",
              description: "Authentication hash for verification",
              example:
                "c501b71e775f74ce10e377dea85a7ea24ecd640b223ea86dfe453e0eaed2e2b2",
            },
          },
        },
        UpdateProfileRequest: {
          type: "object",
          properties: {
            firstName: {
              type: "string",
              minLength: 1,
              maxLength: 50,
              description: "User first name",
              example: "John",
            },
            lastName: {
              type: "string",
              minLength: 1,
              maxLength: 50,
              description: "User last name",
              example: "Doe",
            },
            preferences: {
              type: "object",
              properties: {
                notifications: {
                  type: "boolean",
                  description: "Enable notifications",
                  example: true,
                },
                language: {
                  type: "string",
                  minLength: 2,
                  maxLength: 5,
                  description: "Language preference",
                  example: "en",
                },
              },
            },
          },
        },
        LinkWalletRequest: {
          type: "object",
          required: ["walletAddress"],
          properties: {
            walletAddress: {
              type: "string",
              description: "Stacks wallet address",
              example: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
            },
            signature: {
              type: "string",
              description: "Wallet signature for verification (optional)",
              example: "0x1234567890abcdef...",
            },
          },
        },
        // Response schemas
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID",
              example: "507f1f77bcf86cd799439011",
            },
            telegramId: {
              type: "string",
              description: "Telegram user ID",
              example: "279058397",
            },
            username: {
              type: "string",
              description: "Telegram username",
              example: "johndoe",
            },
            firstName: {
              type: "string",
              description: "User first name",
              example: "John",
            },
            lastName: {
              type: "string",
              description: "User last name",
              example: "Doe",
            },
            walletAddress: {
              type: "string",
              description: "Linked Stacks wallet address",
              example: "SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE",
            },
            kycStatus: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
              description: "KYC verification status",
              example: "pending",
            },
            isActive: {
              type: "boolean",
              description: "Account active status",
              example: true,
            },
            preferences: {
              type: "object",
              properties: {
                notifications: {
                  type: "boolean",
                  example: true,
                },
                language: {
                  type: "string",
                  example: "en",
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation date",
              example: "2023-01-01T00:00:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update date",
              example: "2023-01-01T00:00:00.000Z",
            },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "User authenticated successfully",
            },
            data: {
              type: "object",
              properties: {
                user: {
                  $ref: "#/components/schemas/User",
                },
                token: {
                  type: "string",
                  description: "JWT access token",
                  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                },
                isNewUser: {
                  type: "boolean",
                  description: "Whether this is a new user registration",
                  example: false,
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Operation completed successfully",
            },
            data: {
              type: "object",
              description: "Response data (varies by endpoint)",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            errors: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Detailed error messages",
              example: ["Field validation failed", "Required field missing"],
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Access token is missing or invalid",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Access token required",
              },
            },
          },
        },
        ValidationError: {
          description: "Validation failed",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Validation failed",
                errors: ["initData: Telegram initData is required"],
              },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "User not found",
              },
            },
          },
        },
        ServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ErrorResponse",
              },
              example: {
                success: false,
                message: "Internal server error",
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication and profile management",
      },
      {
        name: "Balance",
        description: "Token and wallet balance queries",
      },
      {
        name: "Pool",
        description: "Pool deposits, withdrawals, and balance queries",
      },
      {
        name: "Transactions",
        description: "Track blockchain transactions",
      },
      {
        name: "Fund Request",
        description: "Secure fund request endpoints for trading bot",
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts", "./src/models/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
