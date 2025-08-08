import { Injectable, NestMiddleware, HttpStatus, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger.service';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly maxRequests = 100; // Max requests per window
  private readonly authMaxRequests = 5; // Max auth requests per window

  constructor(private readonly logger: LoggerService) {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const clientId = this.getClientIdentifier(req);
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = this.rateLimitMap.get(clientId);
    
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.windowMs,
      };
      this.rateLimitMap.set(clientId, entry);
    }

    entry.count++;

    // Determine rate limit based on endpoint
    const isAuthEndpoint = req.path.includes('/auth/');
    const limit = isAuthEndpoint ? this.authMaxRequests : this.maxRequests;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > limit) {
      this.logger.warn(`Rate limit exceeded for client: ${clientId}`, 'RateLimitMiddleware', {
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        count: entry.count,
        limit,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          error: 'Too Many Requests',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private getClientIdentifier(req: Request): string {
    // Use IP address as primary identifier
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // If user is authenticated, use username for more granular control
    const user = (req as any).user;
    if (user && user.username) {
      return `${ip}:${user.username}`;
    }
    
    return ip;
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.rateLimitMap.delete(key));
    
    if (expiredKeys.length > 0) {
      this.logger.debug(`Cleaned up ${expiredKeys.length} expired rate limit entries`, 'RateLimitMiddleware');
    }
  }
}