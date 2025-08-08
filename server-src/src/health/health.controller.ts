import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { HealthService } from './health.service';

// Response DTOs for documentation
class HealthResponse {
  @ApiProperty({ description: 'Health status', example: 'ok' })
  status: string;

  @ApiProperty({ description: 'Timestamp of health check' })
  timestamp: string;

  @ApiProperty({ description: 'Application uptime in seconds' })
  uptime: number;
}

class DetailedHealthResponse extends HealthResponse {
  @ApiProperty({ description: 'Database connection status' })
  database: {
    status: string;
    responseTime?: number;
  };

  @ApiProperty({ description: 'Cache service status' })
  cache: {
    status: string;
    responseTime?: number;
  };

  @ApiProperty({ description: 'Memory usage information' })
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ 
    summary: 'Basic health check', 
    description: 'Returns basic health status of the API' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Health check successful', 
    type: HealthResponse 
  })
  @Get()
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @ApiOperation({ 
    summary: 'Detailed health check', 
    description: 'Returns detailed health status including database, cache, and memory information' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Detailed health check successful', 
    type: DetailedHealthResponse 
  })
  @Get('detailed')
  async getDetailedHealth() {
    return this.healthService.checkDetailedHealth();
  }
}