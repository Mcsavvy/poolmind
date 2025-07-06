import winston from 'winston';
// @ts-ignore
import { config } from '../config/env';

// Safe JSON stringify that handles circular references
const safeStringify = (obj: any, space?: number): string => {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    },
    space
  );
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? safeStringify(meta, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

// Safe error logging utility
export const logError = (message: string, error: any) => {
  logger.error(message, {
    message: error?.message || 'Unknown error',
    code: error?.code,
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    stack: error?.stack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace
  });
};

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'poolmind-telegram-bot' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),

    // File transport for errors
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH || './logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: process.env.LOG_FILE_PATH || './logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],

  exceptionHandlers: [
    new winston.transports.File({ filename: './logs/exceptions.log' }),
  ],

  rejectionHandlers: [
    new winston.transports.File({ filename: './logs/rejections.log' }),
  ],
});

// If we're not in production, log to the console with simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? `\n${safeStringify(meta, 2)}`
            : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      ),
    })
  );
}

export default logger;
