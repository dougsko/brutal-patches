import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from './monitoring.service';

@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  constructor(private readonly monitoringService: MonitoringService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Extract route pattern from request
    const route = this.extractRoute(req);
    const method = req.method;

    // Track the request
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Record HTTP request metrics
      this.monitoringService.recordHttpRequest(
        method,
        route,
        statusCode,
        duration,
      );

      // Record errors for 4xx and 5xx responses
      if (statusCode >= 400) {
        const severity = statusCode >= 500 ? 'error' : 'warning';
        this.monitoringService.recordError('http_error', severity, {
          method,
          route,
          statusCode: statusCode.toString(),
          duration: duration.toString(),
          userAgent: req.get('User-Agent') || 'unknown',
          ip: req.ip || req.connection.remoteAddress || 'unknown',
        });
      }
    });

    // Track active connections
    const currentConnections = (req as any).socket?.server?.connections || 0;
    this.monitoringService.updateActiveConnections(currentConnections);

    next();
  }

  private extractRoute(req: Request): string {
    // Try to get the route pattern from the request
    if (req.route?.path) {
      return req.route.path;
    }

    // Fallback to URL pathname with parameter normalization
    let route = req.url.split('?')[0]; // Remove query string

    // Normalize common patterns
    route = route
      .replace(/\/\d+/g, '/:id') // Replace numeric IDs
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs
      .replace(/\/[a-f0-9]{24}/g, '/:objectId'); // Replace MongoDB ObjectIds

    return route;
  }
}
