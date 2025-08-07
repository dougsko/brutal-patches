import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint()
    );

    // Different log levels for different environments
    const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: { service: 'brutal-patches-api' },
      transports: [
        // Write errors to error.log
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // Write all logs to combined.log
        new winston.transports.File({ 
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 10,
        }),
      ],
      // Handle exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ]
    });

    // In development, also log to console
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }

    // In AWS Lambda, log to CloudWatch (console)
    if (process.env.AWS_EXECUTION_ENV) {
      this.logger.add(new winston.transports.Console({
        format: winston.format.json()
      }));
    }
  }

  log(message: string, context?: string, meta?: any) {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    this.logger.error(message, { trace, context, ...meta });
  }

  warn(message: string, context?: string, meta?: any) {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: any) {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: any) {
    this.logger.verbose(message, { context, ...meta });
  }

  // Specific methods for common logging scenarios
  logRequest(req: any, res: any, responseTime?: number) {
    const logData = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      statusCode: res.statusCode,
      responseTime: responseTime || 0,
      userId: req.user?.username || 'anonymous'
    };

    this.logger.info('HTTP Request', logData);
  }

  logError(error: Error, context?: string, request?: any) {
    const logData = {
      message: error.message,
      stack: error.stack,
      context,
      url: request?.url,
      method: request?.method,
      userId: request?.user?.username || 'anonymous'
    };

    this.logger.error('Application Error', logData);
  }

  logAuth(event: string, username?: string, success?: boolean, details?: any) {
    this.logger.info('Authentication Event', {
      event,
      username: username || 'unknown',
      success,
      ...details
    });
  }
}