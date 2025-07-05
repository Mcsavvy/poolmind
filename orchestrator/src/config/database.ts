import mongoose from "mongoose";
import winston from "winston";
import { config } from "./index";

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: config.logging.files.error,
      level: "error",
    }),
    new winston.transports.File({
      filename: config.logging.files.combined,
    }),
  ],
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.database.mongoUri, config.database.options);

    logger.info("MongoDB connected successfully", {
      uri: config.database.mongoUri.replace(/\/\/.*@/, "//*****@"), // Hide credentials in logs
      options: config.database.options,
    });
  } catch (error) {
    logger.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default mongoose;
