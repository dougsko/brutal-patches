import { Injectable } from '@nestjs/common';
import { LoggerService } from '../common/logger.service';
import * as os from 'os';

@Injectable()
export class HealthService {
  constructor(private readonly logger: LoggerService) {}

  async checkHealth() {
    const status = 'ok';
    const timestamp = new Date().toISOString();

    this.logger.log('Health check requested', 'HealthService');

    return {
      status,
      timestamp,
      service: 'brutal-patches-api',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    };
  }

  async checkDetailedHealth() {
    const basicHealth = await this.checkHealth();

    // Check database connectivity
    let databaseStatus = 'unknown';
    try {
      // TODO: Add actual database connection check when implementing
      databaseStatus = 'ok';
    } catch (error) {
      databaseStatus = 'error';
      this.logger.error(
        'Database health check failed',
        error.message,
        'HealthService',
      );
    }

    // System information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      loadAverage: os.loadavg(),
      cpuCount: os.cpus().length,
    };

    // Environment information (safe items only)
    const environmentInfo = {
      nodeEnv: process.env.NODE_ENV || 'development',
      awsRegion: process.env.AWS_REGION,
      isLambda: !!process.env.AWS_EXECUTION_ENV,
    };

    return {
      ...basicHealth,
      checks: {
        database: databaseStatus,
      },
      system: systemInfo,
      environment: environmentInfo,
    };
  }
}
