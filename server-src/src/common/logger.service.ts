import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

@Injectable()
export class LoggerService {
  private logger: winston.Logger;
  private cloudWatchLogs: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private nextSequenceToken: string | undefined;

  constructor() {
    // Initialize CloudWatch Logs client
    this.cloudWatchLogs = new CloudWatchLogsClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.logGroupName = '/aws/brutal-patches/api';
    this.logStreamName = `api-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Initialize CloudWatch log stream in production
    if (process.env.NODE_ENV === 'production') {
      this.initializeCloudWatchStream();
    }
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint(),
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
        new winston.transports.File({ filename: 'logs/exceptions.log' }),
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' }),
      ],
    });

    // In development, also log to console
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      );
    }

    // In AWS Lambda, log to CloudWatch (console)
    if (process.env.AWS_EXECUTION_ENV) {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.json(),
        }),
      );
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
      userId: req.user?.username || 'anonymous',
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
      userId: request?.user?.username || 'anonymous',
    };

    this.logger.error('Application Error', logData);
  }

  logAuth(event: string, username?: string, success?: boolean, details?: any) {
    this.logger.info('Authentication Event', {
      event,
      username: username || 'unknown',
      success,
      ...details,
    });
  }

  // Enhanced logging methods with CloudWatch integration
  async logWithMetrics(
    level: string,
    message: string,
    context?: string,
    meta?: any,
  ) {
    const logEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    // Log locally with Winston
    this.logger.log(level, message, { context, ...meta });

    // Send to CloudWatch in production
    if (process.env.NODE_ENV === 'production') {
      await this.sendToCloudWatch(logEntry);
    }
  }

  // Structured logging for security events
  async logSecurityEvent(event: string, userId?: string, details?: any) {
    const securityLog = {
      type: 'security',
      event,
      userId,
      timestamp: new Date().toISOString(),
      ip: details?.ip,
      userAgent: details?.userAgent,
      ...details,
    };

    this.logger.warn(`Security Event: ${event}`, securityLog);

    if (process.env.NODE_ENV === 'production') {
      await this.sendToCloudWatch(securityLog);
    }
  }

  // Performance logging
  async logPerformance(operation: string, duration: number, metadata?: any) {
    const performanceLog = {
      type: 'performance',
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    if (duration > 1000) {
      // Log slow operations
      this.logger.warn(
        `Slow Operation: ${operation} took ${duration}ms`,
        performanceLog,
      );
    } else {
      this.logger.info(
        `Performance: ${operation} completed in ${duration}ms`,
        performanceLog,
      );
    }

    if (process.env.NODE_ENV === 'production') {
      await this.sendToCloudWatch(performanceLog);
    }
  }

  // Business event logging
  async logBusinessEvent(event: string, userId?: string, metadata?: any) {
    const businessLog = {
      type: 'business',
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    this.logger.info(`Business Event: ${event}`, businessLog);

    if (process.env.NODE_ENV === 'production') {
      await this.sendToCloudWatch(businessLog);
    }
  }

  // Initialize CloudWatch log stream
  private async initializeCloudWatchStream() {
    try {
      const command = new CreateLogStreamCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
      });

      await this.cloudWatchLogs.send(command);
    } catch (error) {
      // Stream might already exist or log group doesn't exist
      console.warn(
        'Could not initialize CloudWatch log stream:',
        error.message,
      );
    }
  }

  // Send log to CloudWatch
  private async sendToCloudWatch(logEntry: any) {
    try {
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [
          {
            message: JSON.stringify(logEntry),
            timestamp: Date.now(),
          },
        ],
        sequenceToken: this.nextSequenceToken,
      });

      const response = await this.cloudWatchLogs.send(command);
      this.nextSequenceToken = response.nextSequenceToken;
    } catch (error) {
      // Fail silently to avoid infinite logging loops
      console.warn('Failed to send log to CloudWatch:', error.message);
    }
  }
}
