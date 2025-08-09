import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Log incoming request
    const requestData = {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      userId: (req as any).user?.username || 'anonymous',
    };

    this.logger.log('Incoming Request', 'LoggerMiddleware', requestData);

    // Override res.json to capture response data
    const originalJson = res.json;
    const logger = this.logger;
    res.json = function (body) {
      const responseTime = Date.now() - startTime;

      const responseData = {
        ...requestData,
        statusCode: res.statusCode,
        responseTime,
        responseSize: JSON.stringify(body).length,
      };

      // Log response with appropriate level
      if (res.statusCode >= 400) {
        logger.warn(
          'Request Completed with Error',
          'LoggerMiddleware',
          responseData,
        );
      } else {
        logger.log('Request Completed', 'LoggerMiddleware', responseData);
      }

      return originalJson.call(this, body);
    };

    next();
  }
}
