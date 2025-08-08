import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        details = (exceptionResponse as any).details || null;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.logError(exception, 'UnhandledException', request);
    } else {
      message = 'Unknown error occurred';
      this.logger.error(
        'Unknown Exception',
        String(exception),
        'AllExceptionsFilter',
        {
          url: request.url,
          method: request.method,
        },
      );
    }

    // Don't expose internal errors to clients in production
    if (
      status === HttpStatus.INTERNAL_SERVER_ERROR &&
      process.env.NODE_ENV === 'production'
    ) {
      message = 'Internal server error';
      details = null;
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV !== 'production' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Log the error with appropriate level
    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        undefined,
        'HttpExceptionFilter',
        {
          ...errorResponse,
          userAgent: request.get('User-Agent'),
          ip: request.ip,
          userId: (request as any).user?.username || 'anonymous',
        },
      );
    } else if (status >= 400) {
      this.logger.warn(
        `HTTP ${status} Client Error: ${message}`,
        'HttpExceptionFilter',
        {
          url: request.url,
          method: request.method,
          userId: (request as any).user?.username || 'anonymous',
        },
      );
    }

    response.status(status).json(errorResponse);
  }
}
