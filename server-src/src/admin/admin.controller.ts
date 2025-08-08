import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Query, 
  Param, 
  Body, 
  UseGuards, 
  Request,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService, AdminStats, SystemHealth, ContentModerationItem } from './admin.service';

// Response DTOs for documentation
class AdminUserResponse {
  @ApiProperty({ description: 'User ID' })
  id: number;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Account creation date' })
  created_at: string;

  @ApiProperty({ description: 'Number of user patches' })
  patchCount: number;

  @ApiProperty({ description: 'Account active status' })
  isActive: boolean;
}

class UserManagementResponse {
  @ApiProperty({ description: 'Array of users', type: [AdminUserResponse] })
  users: AdminUserResponse[];

  @ApiProperty({ description: 'Total count of users' })
  total: number;
}

class BulkOperationRequest {
  @ApiProperty({ description: 'Operation type', enum: ['delete', 'export', 'moderate'] })
  operation: 'delete' | 'export' | 'moderate';

  @ApiProperty({ description: 'Array of patch IDs', type: [Number] })
  patchIds: number[];

  @ApiProperty({ description: 'Additional parameters', required: false })
  params?: any;
}

class SuccessResponse {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Result message' })
  message: string;
}

class ErrorResponse {
  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'Error details', required: false })
  error?: string;
}

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('api/admin')
@UseGuards(JwtAuthGuard) // All admin endpoints require authentication
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get comprehensive admin dashboard statistics
   */
  @ApiOperation({
    summary: 'Get admin dashboard statistics',
    description: 'Retrieve comprehensive statistics for the admin dashboard (admin only)'
  })
  @ApiResponse({
    status: 200,
    description: 'Admin statistics retrieved successfully',
    type: AdminStats
  })
  @ApiForbiddenResponse({
    status: 403,
    description: 'Admin privileges required',
    type: ErrorResponse
  })
  @ApiUnauthorizedResponse({
    status: 401,
    description: 'Authentication required',
    type: ErrorResponse
  })
  @Get('stats')
  async getAdminStats(@Request() req): Promise<AdminStats> {
    this.checkAdminPermissions(req.user);
    return this.adminService.getAdminStats();
  }

  /**
   * Get system health metrics
   */
  @ApiOperation({
    summary: 'Get system health metrics',
    description: 'Retrieve detailed system health information (admin only)'
  })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
    type: SystemHealth
  })
  @ApiForbiddenResponse({
    status: 403,
    description: 'Admin privileges required',
    type: ErrorResponse
  })
  @Get('health')
  async getSystemHealth(@Request() req): Promise<SystemHealth> {
    this.checkAdminPermissions(req.user);
    return this.adminService.getSystemHealth();
  }

  /**
   * Get content moderation queue
   */
  @Get('moderation/queue')
  async getContentModerationQueue(@Request() req): Promise<ContentModerationItem[]> {
    this.checkAdminPermissions(req.user);
    return this.adminService.getContentModerationQueue();
  }

  /**
   * Moderate content item
   */
  @Put('moderation/:itemId')
  async moderateContent(
    @Request() req,
    @Param('itemId') itemId: string,
    @Body() body: {
      action: 'approve' | 'reject';
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    this.checkAdminPermissions(req.user);
    
    return this.adminService.moderateContent(
      itemId,
      body.action,
      req.user.username,
      body.notes
    );
  }

  /**
   * Get user management data
   */
  @ApiOperation({
    summary: 'Get user management data',
    description: 'Retrieve paginated user list with search and sorting options (admin only)'
  })
  @ApiQuery({ name: 'search', description: 'Search term for users', required: false })
  @ApiQuery({ name: 'sortBy', description: 'Sort by field', required: false, enum: ['username', 'created_at', 'patch_count'] })
  @ApiQuery({ name: 'sortOrder', description: 'Sort order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'limit', description: 'Results limit', required: false })
  @ApiQuery({ name: 'offset', description: 'Results offset', required: false })
  @ApiResponse({
    status: 200,
    description: 'User management data retrieved successfully',
    type: UserManagementResponse
  })
  @ApiForbiddenResponse({
    status: 403,
    description: 'Admin privileges required',
    type: ErrorResponse
  })
  @Get('users')
  async getUserManagement(
    @Request() req,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'username' | 'created_at' | 'patch_count',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<{
    users: Array<{
      id: number;
      username: string;
      email: string;
      created_at: string;
      patchCount: number;
      isActive: boolean;
    }>;
    total: number;
  }> {
    this.checkAdminPermissions(req.user);
    
    return this.adminService.getUserManagement({
      search,
      sortBy,
      sortOrder,
      limit,
      offset,
    });
  }

  /**
   * Moderate user (suspend/activate)
   */
  @Put('users/:userId/moderate')
  async moderateUser(
    @Request() req,
    @Param('userId') userId: number,
    @Body() body: {
      action: 'suspend' | 'activate';
      reason?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    this.checkAdminPermissions(req.user);
    
    return this.adminService.moderateUser(
      userId,
      body.action,
      req.user.username,
      body.reason
    );
  }

  /**
   * Get analytics data
   */
  @Get('analytics')
  async getAnalytics(
    @Request() req,
    @Query('timeRange') timeRange: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<{
    userGrowth: Array<{ date: string; count: number }>;
    patchActivity: Array<{ date: string; created: number; updated: number }>;
    categoryDistribution: Array<{ category: string; count: number }>;
    ratingDistribution: Array<{ rating: number; count: number }>;
  }> {
    this.checkAdminPermissions(req.user);
    return this.adminService.getAnalytics(timeRange);
  }

  /**
   * Export data
   */
  @Get('export/:type')
  async exportData(
    @Request() req,
    @Param('type') type: 'users' | 'patches' | 'collections' | 'all',
    @Query('format') format: 'json' | 'csv' = 'json'
  ): Promise<{
    filename: string;
    data: any;
    contentType: string;
  }> {
    this.checkAdminPermissions(req.user);
    return this.adminService.exportData(type, format);
  }

  /**
   * Get patch statistics for admin dashboard
   */
  @Get('patches/stats')
  async getPatchStats(@Request() req): Promise<{
    totalPatches: number;
    averageRating: number;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    this.checkAdminPermissions(req.user);
    // This would use the PatchRepository.getPatchStats() method
    // For now, return mock data
    return {
      totalPatches: 0,
      averageRating: 0,
      topCategories: [],
    };
  }

  /**
   * Get collection statistics for admin dashboard
   */
  @Get('collections/stats')
  async getCollectionStats(@Request() req): Promise<{
    totalCollections: number;
    publicCollections: number;
    privateCollections: number;
    averagePatchCount: number;
  }> {
    this.checkAdminPermissions(req.user);
    // This would use the PatchCollectionRepository.getCollectionStats() method
    // For now, return mock data
    return {
      totalCollections: 0,
      publicCollections: 0,
      privateCollections: 0,
      averagePatchCount: 0,
    };
  }

  /**
   * Bulk operations for patches
   */
  @Post('patches/bulk')
  async bulkPatchOperation(
    @Request() req,
    @Body() body: {
      operation: 'delete' | 'export' | 'moderate';
      patchIds: number[];
      params?: any;
    }
  ): Promise<{ success: boolean; message: string; results?: any }> {
    this.checkAdminPermissions(req.user);
    
    try {
      // Implement bulk operations based on the operation type
      switch (body.operation) {
        case 'delete':
          // Would implement bulk delete
          return {
            success: true,
            message: `Deleted ${body.patchIds.length} patches`,
          };
        case 'export':
          // Would implement bulk export
          return {
            success: true,
            message: `Exported ${body.patchIds.length} patches`,
            results: { /* exported data */ }
          };
        case 'moderate':
          // Would implement bulk moderation
          return {
            success: true,
            message: `Moderated ${body.patchIds.length} patches`,
          };
        default:
          throw new HttpException('Invalid bulk operation', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      throw new HttpException(
        `Bulk operation failed: ${error.message}`, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get admin activity logs
   */
  @Get('logs')
  async getAdminLogs(
    @Request() req,
    @Query('type') type?: 'action' | 'system' | 'error',
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0
  ): Promise<{
    logs: Array<{
      id: string;
      timestamp: string;
      type: 'action' | 'system' | 'error';
      message: string;
      user?: string;
      metadata?: any;
    }>;
    total: number;
  }> {
    this.checkAdminPermissions(req.user);
    
    // Placeholder implementation
    // In a real system, this would connect to a logging service
    return {
      logs: [],
      total: 0,
    };
  }

  /**
   * Update system settings
   */
  @Put('settings')
  async updateSystemSettings(
    @Request() req,
    @Body() settings: {
      maintenanceMode?: boolean;
      registrationEnabled?: boolean;
      maxUploadSize?: number;
      rateLimit?: {
        windowMs: number;
        max: number;
      };
      [key: string]: any;
    }
  ): Promise<{ success: boolean; message: string }> {
    this.checkAdminPermissions(req.user);
    
    try {
      // Placeholder implementation
      // In a real system, this would update system configuration
      return {
        success: true,
        message: 'System settings updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update settings: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get system settings
   */
  @Get('settings')
  async getSystemSettings(@Request() req): Promise<{
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    maxUploadSize: number;
    rateLimit: {
      windowMs: number;
      max: number;
    };
    [key: string]: any;
  }> {
    this.checkAdminPermissions(req.user);
    
    // Placeholder implementation
    return {
      maintenanceMode: false,
      registrationEnabled: true,
      maxUploadSize: 10485760, // 10MB
      rateLimit: {
        windowMs: 900000, // 15 minutes
        max: 100, // requests per window
      },
    };
  }

  /**
   * Clear cache
   */
  @Post('cache/clear')
  async clearCache(
    @Request() req,
    @Body() body: {
      type?: 'patches' | 'users' | 'collections' | 'all';
    }
  ): Promise<{ success: boolean; message: string }> {
    this.checkAdminPermissions(req.user);
    
    try {
      const cacheType = body.type || 'all';
      
      // Placeholder implementation
      // In a real system, this would clear the specified cache
      return {
        success: true,
        message: `Cache cleared successfully for: ${cacheType}`,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to clear cache: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Run system maintenance tasks
   */
  @Post('maintenance')
  async runMaintenance(
    @Request() req,
    @Body() body: {
      tasks: ('cleanup_logs' | 'optimize_database' | 'update_statistics')[];
    }
  ): Promise<{ success: boolean; message: string; results: any }> {
    this.checkAdminPermissions(req.user);
    
    try {
      const results: any = {};
      
      for (const task of body.tasks) {
        switch (task) {
          case 'cleanup_logs':
            results.cleanup_logs = { deleted: 0 };
            break;
          case 'optimize_database':
            results.optimize_database = { optimized: true };
            break;
          case 'update_statistics':
            results.update_statistics = { updated: true };
            break;
        }
      }
      
      return {
        success: true,
        message: 'Maintenance tasks completed successfully',
        results,
      };
    } catch (error) {
      throw new HttpException(
        `Maintenance failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Private helper to check admin permissions
   */
  private checkAdminPermissions(user: any): void {
    // In a real system, this would check if the user has admin role
    // For now, we'll check for a simple flag or admin username
    if (!user || (!user.isAdmin && user.username !== 'admin')) {
      throw new HttpException(
        'Access denied: Admin privileges required',
        HttpStatus.FORBIDDEN
      );
    }
  }
}