import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

// Response DTOs
class MetricsResponse {
  @ApiProperty({ description: 'Prometheus format metrics' })
  metrics: string;
}

class DashboardMetricsResponse {
  @ApiProperty({ description: 'HTTP request metrics' })
  httpRequests: any;

  @ApiProperty({ description: 'HTTP duration metrics' })
  httpDuration: any;

  @ApiProperty({ description: 'Database operation metrics' })
  databaseOperations: any;

  @ApiProperty({ description: 'Cache operation metrics' })
  cacheOperations: any;

  @ApiProperty({ description: 'Error metrics' })
  errors: any;

  @ApiProperty({ description: 'Patch operation metrics' })
  patchOperations: any;

  @ApiProperty({ description: 'User operation metrics' })
  userOperations: any;
}

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @ApiOperation({
    summary: 'Get Prometheus metrics',
    description: 'Returns application metrics in Prometheus format for scraping',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics returned successfully',
    type: String,
    schema: {
      type: 'string',
      example: '# HELP http_requests_total Total number of HTTP requests\\n# TYPE http_requests_total counter\\nhttp_requests_total{method="GET",route="/api/patches",status_code="200"} 42',
    },
  })
  @Get('metrics')
  async getMetrics(): Promise<string> {
    return this.monitoringService.getMetrics();
  }

  @ApiOperation({
    summary: 'Get dashboard metrics',
    description: 'Returns formatted metrics for admin dashboard (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics returned successfully',
    type: DashboardMetricsResponse,
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @Get('dashboard')
  async getDashboardMetrics(): Promise<DashboardMetricsResponse> {
    return this.monitoringService.getDashboardMetrics();
  }

  @ApiOperation({
    summary: 'Health check with metrics',
    description: 'Returns basic health status with key performance indicators',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check with metrics successful',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', description: 'Uptime in seconds' },
        metrics: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number' },
            averageResponseTime: { type: 'number' },
            errorRate: { type: 'number' },
            activeConnections: { type: 'number' },
          },
        },
      },
    },
  })
  @Get('health-metrics')
  async getHealthWithMetrics() {
    const startTime = process.uptime();
    const metrics = await this.monitoringService.getDashboardMetrics();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: startTime,
      metrics: {
        totalRequests: 'Available in metrics endpoint',
        averageResponseTime: 'Available in metrics endpoint',
        errorRate: 'Available in metrics endpoint',
        activeConnections: 'Available in metrics endpoint',
      },
      metricsEndpoint: '/monitoring/metrics',
      dashboardEndpoint: '/monitoring/dashboard',
    };
  }
}