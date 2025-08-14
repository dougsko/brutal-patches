import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  register,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
// X-Ray SDK with proper TypeScript import
import * as AWSXRay from 'aws-xray-sdk-core';
import { LoggerService } from '../logger.service';

@Injectable()
export class MonitoringService implements OnModuleInit {
  private cloudWatch: CloudWatchClient;
  private readonly namespace = 'BrutalPatches/API';

  // Prometheus metrics
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly databaseConnectionsTotal: Counter<string>;
  private readonly databaseQueryDuration: Histogram<string>;
  private readonly cacheOperationsTotal: Counter<string>;
  private readonly patchOperationsTotal: Counter<string>;
  private readonly userOperationsTotal: Counter<string>;
  private readonly errorRate: Counter<string>;
  private readonly jwtTokensIssued: Counter<string>;

  constructor(private readonly logger: LoggerService) {
    // Initialize CloudWatch client
    this.cloudWatch = new CloudWatchClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // Initialize Prometheus metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [register],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [register],
    });

    this.databaseConnectionsTotal = new Counter({
      name: 'database_connections_total',
      help: 'Total number of database connections',
      labelNames: ['operation', 'table'],
      registers: [register],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [register],
    });

    this.cacheOperationsTotal = new Counter({
      name: 'cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'result'],
      registers: [register],
    });

    this.patchOperationsTotal = new Counter({
      name: 'patch_operations_total',
      help: 'Total number of patch operations',
      labelNames: ['operation', 'user_role'],
      registers: [register],
    });

    this.userOperationsTotal = new Counter({
      name: 'user_operations_total',
      help: 'Total number of user operations',
      labelNames: ['operation'],
      registers: [register],
    });

    this.errorRate = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity'],
      registers: [register],
    });

    this.jwtTokensIssued = new Counter({
      name: 'jwt_tokens_issued_total',
      help: 'Total number of JWT tokens issued',
      labelNames: ['type'],
      registers: [register],
    });
  }

  onModuleInit() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register });

    // Skip X-Ray configuration in MonitoringService since it's handled in lambda.ts
    // This avoids conflicts during module initialization
    this.logger.log('Monitoring service initialized', 'MonitoringService');
  }

  // HTTP Request Metrics
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
    this.httpRequestDuration.observe({ method, route }, duration / 1000);

    // Send to CloudWatch
    this.sendToCloudWatch('HttpRequests', 1, 'Count', {
      Method: method,
      Route: route,
      StatusCode: statusCode.toString(),
    });
  }

  // Database Metrics
  recordDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
  ) {
    this.databaseConnectionsTotal.inc({ operation, table });
    this.databaseQueryDuration.observe({ operation, table }, duration / 1000);

    if (!success) {
      this.errorRate.inc({ type: 'database', severity: 'error' });
    }

    this.sendToCloudWatch('DatabaseOperations', 1, 'Count', {
      Operation: operation,
      Table: table,
      Success: success.toString(),
    });
  }

  // Cache Metrics
  recordCacheOperation(operation: string, result: 'hit' | 'miss' | 'error') {
    this.cacheOperationsTotal.inc({ operation, result });

    this.sendToCloudWatch('CacheOperations', 1, 'Count', {
      Operation: operation,
      Result: result,
    });
  }

  // Patch Operations Metrics
  recordPatchOperation(operation: string, userRole: string) {
    this.patchOperationsTotal.inc({ operation, user_role: userRole });

    this.sendToCloudWatch('PatchOperations', 1, 'Count', {
      Operation: operation,
      UserRole: userRole,
    });
  }

  // User Operations Metrics
  recordUserOperation(operation: string) {
    this.userOperationsTotal.inc({ operation });

    this.sendToCloudWatch('UserOperations', 1, 'Count', {
      Operation: operation,
    });
  }

  // Authentication Metrics
  recordJWTToken(type: 'login' | 'refresh') {
    this.jwtTokensIssued.inc({ type });

    this.sendToCloudWatch('AuthenticationEvents', 1, 'Count', {
      Type: type,
    });
  }

  // Error Tracking
  recordError(
    type: string,
    severity: 'warning' | 'error' | 'critical',
    metadata?: Record<string, any>,
  ) {
    this.errorRate.inc({ type, severity });

    this.sendToCloudWatch('Errors', 1, 'Count', {
      Type: type,
      Severity: severity,
      ...metadata,
    });

    this.logger.error(
      `Error recorded: ${type}`,
      JSON.stringify(metadata),
      'MonitoringService',
    );
  }

  // Business Metrics
  recordBusinessMetric(
    metricName: string,
    value: number,
    unit: 'Count' | 'Seconds' | 'Percent' | 'Bytes',
    dimensions?: Record<string, string>,
  ) {
    this.sendToCloudWatch(metricName, value, unit, dimensions);
  }

  // Active Connections
  updateActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  // Performance monitoring with X-Ray
  createXRaySegment(
    name: string,
    callback: (segment: any) => Promise<any>,
  ): Promise<any> {
    // Only use X-Ray in production Lambda environment
    if (process.env.NODE_ENV !== 'production' || !process.env._X_AMZN_TRACE_ID) {
      return callback(null);
    }

    try {
      return new Promise((resolve, reject) => {
        AWSXRay.captureAsyncFunc(name, async (subsegment) => {
          try {
            const result = await callback(subsegment);
            if (subsegment) {
              subsegment.close();
            }
            resolve(result);
          } catch (error) {
            if (subsegment) {
              subsegment.addError(error);
              subsegment.close(error);
            }
            reject(error);
          }
        });
      });
    } catch (error) {
      // Fallback if X-Ray is not available
      this.logger.warn('X-Ray not available, falling back to direct execution');
      return callback(null);
    }
  }

  // Get current metrics for health checks
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Custom dashboard metrics
  async getDashboardMetrics(): Promise<any> {
    await register.getSingleMetricAsString('http_requests_total');

    return {
      httpRequests: await register.getSingleMetricAsString(
        'http_requests_total',
      ),
      httpDuration: await register.getSingleMetricAsString(
        'http_request_duration_seconds',
      ),
      databaseOperations: await register.getSingleMetricAsString(
        'database_connections_total',
      ),
      cacheOperations: await register.getSingleMetricAsString(
        'cache_operations_total',
      ),
      errors: await register.getSingleMetricAsString('errors_total'),
      patchOperations: await register.getSingleMetricAsString(
        'patch_operations_total',
      ),
      userOperations: await register.getSingleMetricAsString(
        'user_operations_total',
      ),
    };
  }

  // Send metric to CloudWatch
  private async sendToCloudWatch(
    metricName: string,
    value: number,
    unit: 'Count' | 'Seconds' | 'Percent' | 'Bytes',
    dimensions?: Record<string, string>,
  ) {
    if (process.env.NODE_ENV !== 'production') {
      return; // Skip CloudWatch in development
    }

    try {
      const dimensionArray = dimensions
        ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
        : [];

      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Dimensions: dimensionArray,
            Timestamp: new Date(),
          },
        ],
      });

      await this.cloudWatch.send(command);
    } catch (error) {
      this.logger.error(
        `Failed to send metric to CloudWatch: ${metricName}`,
        error.message,
        'MonitoringService',
      );
    }
  }

  // Cleanup on module destroy
  onModuleDestroy() {
    register.clear();
  }
}
