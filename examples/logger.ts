import winston, { level } from "winston";
import { ILogger } from "../src/logger/type";


const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" })
  ]
});


const customLogger: ILogger = {
  debug: (message: string, ...meta: any[]) => {
    logger.debug(message, ...meta);
  },
  info: (message: string, ...meta: any[]) => {
    logger.info(message, ...meta);
  },
  warn: (message: string, ...meta: any[]) => {
    logger.warn(message, ...meta);
  },
  error: (message: string, ...meta: any[]) => {
    logger.error(message, ...meta);
  }
};

export default customLogger;
