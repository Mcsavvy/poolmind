PoolMind is a full-stack platform built on the Stacks blockchain for a pooled crypto arbitrage fund. The system prioritizes security, modularity, and user experience, and comprises three primary components: a Clarity smart contract, an Orchestrator API, and a Telegram Bot.

**1. PoolMind Smart Contract:** This Clarity-based smart contract (located in the `contracts` directory) acts as the core of the fund. It allows users to deposit Stacks tokens (STX) and receive PoolMind tokens (PLMD), a SIP-010 compliant fungible token representing their fund share. The contract's functionality encompasses deposit and withdrawal handling, Net Asset Value (NAV) calculation and updates, PLMD token issuance and transfer (with optional restrictions), and administrative controls. Key features include fee structures for deposits and withdrawals, an emergency pause mechanism, and administrator control capabilities. The contract is engineered to provide a secure and transparent environment for users participating in pooled crypto arbitrage strategies.

**2. PoolMind Orchestrator API:** This backend service, developed using Node.js (Express.js) and TypeScript, provides centralized platform functionality, focusing on user management, authentication, and interactions with both the smart contract and the Telegram Bot. The API is designed with a modular architecture to ensure security and scalability and integrates with the Stacks blockchain using a MongoDB database. It offers comprehensive functionality, including:

- **User Management:** Handling user profile management and updates.
- **Authentication & Authorization:** Implementing user login via the Telegram Web App using JWT tokens and supporting KYC verification.
- **Wallet Integration:** Enabling users to link and manage their Stacks wallet addresses.
- **API Endpoints:** Providing endpoints for authentication, balance retrieval, fund requests, pool operations, and transaction management. HMAC signature validation is used for fund requests.

The API leverages various supporting infrastructure components, including: `dotenv` and `zod` for environment variable management, Mongoose for database interactions, Winston for logging, Swagger UI for API documentation, and Bull queues (via Redis) for asynchronous processing. Specific services are implemented for core contract interactions, pool operations, user accounts, and secure STX transfers. Deployment utilizes Docker Compose for containerization, configuration, and service orchestration, including build and runtime configuration via a `Dockerfile`.

A React-based frontend, built with TypeScript and Vite, provides the user interface. This frontend incorporates Stacks blockchain integration, wallet connection, an API client, routing, authentication, and pool operation features.

**3. PoolMind Telegram Bot:** This bot provides a user-friendly Telegram interface for interacting with the PoolMind platform. It’s developed using Node.js/TypeScript and the `telegraf` library. The bot's core functionalities encompass:

- **Bot Interaction:** Using `telegraf` for communication with the Telegram API, command processing, callback queries, and sending notifications.
- **Platform Integration:** Interacting with the PoolMind API to fetch trading data, execute trades, and manage user portfolios, using an `ApiService`.
- **User Management:** Implementing user registration, session management (using Redis), and authentication, including an onboarding experience and profile management features.
- **Alerting and Notifications:** Sending real-time alerts to users about arbitrage opportunities and portfolio updates via Redis pub/sub.
- **Command Handling:** Processing and executing user commands like `/start`, `/help`, and `/profile`.

The bot's architecture is modular, with components for configuration, services, middleware, commands, and utilities, using a microservices-like approach with Redis for pub/sub messaging. Key components include an `AuthService` for authentication and session management, a `NotificationSubscriber` for distributing notifications, and a `KeyboardBuilder` for interactive interfaces. Dependencies include `telegraf`, `@telegraf/session`, `axios`, `dotenv`, `joi`, `moment`, `node-cron`, `rate-limiter-flexible`, `redis`, `uuid`, `winston`, and TypeScript, among others. Security measures include rate limiting and authentication middleware, along with robust error handling and logging for debugging and monitoring.
