import app from "./app";
import http from "http";
import { connectDatabase } from "./config/database";
import { config } from "./config";
import { queueProcessor } from "./services/queueProcessor";
import { notificationService } from "./services/notificationService";

const server = http.createServer(app);

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDatabase();

    // Start queue processor
    queueProcessor.start();
    server.listen(config.server.port, config.server.host, () => {
      console.log(
        `🚀 Server is running on ${config.server.host}:${config.server.port}`,
      );
      console.log(
        `📖 API Documentation available at ${config.server.appUrl}/api-docs`,
      );
      console.log(`🌍 Environment: ${config.server.nodeEnv}`);
      console.log(
        `📊 API Base URL: ${config.server.appUrl}${config.api.baseUrl}`,
      );
      console.log(
        `📜 Smart Contract Address: ${config.contracts.poolmind.address}.${config.contracts.poolmind.name}`,
      );
      console.log(
        `🔄 Queue processor started: concurrency ${config.queue.concurrency}`,
      );
      console.log(
        `🔔 Notification service started: channel poolmind-notifications`,
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Stop queue processor
    await queueProcessor.stop();
    console.log("Queue processor stopped");

    // Close notification service
    await notificationService.close();
    console.log("Notification service closed");

    // Close server
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.log("Forcing shutdown after 10 seconds");
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});
