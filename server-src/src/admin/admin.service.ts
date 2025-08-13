import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PatchService } from '../patch/patch.service';
import { PatchRepository } from '../patch/patch.repository';
import { PatchCollectionRepository } from '../patch/patch-collection.repository';
import { BulkOperationsService } from './bulk-operations.service';

export interface AdminStats {
  users: {
    total: number;
    activeUsers: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
  };
  patches: {
    total: number;
    newPatchesThisWeek: number;
    newPatchesThisMonth: number;
    averageRating: number;
    topCategories: Array<{ category: string; count: number }>;
  };
  collections: {
    total: number;
    publicCollections: number;
    privateCollections: number;
    averagePatchCount: number;
  };
  activity: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    responseTime: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  errors: {
    count: number;
    recentErrors: Array<{
      timestamp: string;
      message: string;
      level: 'error' | 'warning';
    }>;
  };
}

export interface ContentModerationItem {
  id: string;
  type: 'patch' | 'collection' | 'user';
  content: any;
  reportedAt: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  moderatedBy?: string;
  moderatedAt?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private patchService: PatchService,
    private patchRepository: PatchRepository,
    private collectionRepository: PatchCollectionRepository,
    private bulkOperationsService: BulkOperationsService,
  ) {}

  /**
   * Get comprehensive admin statistics
   */
  async getAdminStats(): Promise<AdminStats> {
    try {
      // Get user statistics
      const users = await this.getUserStats();

      // Get patch statistics
      const patchStats = await this.patchRepository.getPatchStats();
      const patches = {
        total: patchStats.totalPatches,
        newPatchesThisWeek: 0, // Would be implemented with proper date filtering
        newPatchesThisMonth: 0, // Would be implemented with proper date filtering
        averageRating: patchStats.averageRating,
        topCategories: patchStats.topCategories,
      };

      // Get collection statistics
      const collectionStats =
        await this.collectionRepository.getCollectionStats();
      const collections = {
        total: collectionStats.totalCollections,
        publicCollections: collectionStats.publicCollections,
        privateCollections: collectionStats.privateCollections,
        averagePatchCount: collectionStats.averagePatchCount,
      };

      // Get activity statistics (placeholder for now)
      const activity = {
        dailyActiveUsers: 0, // Would be implemented with proper activity tracking
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
      };

      return {
        users,
        patches,
        collections,
        activity,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new HttpException(
        'Failed to get admin statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Test database connectivity
      let dbStatus: 'connected' | 'disconnected' | 'slow' = 'connected';
      let responseTime = 0;

      try {
        const testStart = Date.now();
        await this.patchRepository.count();
        responseTime = Date.now() - testStart;

        if (responseTime > 1000) {
          dbStatus = 'slow';
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        dbStatus = 'disconnected';
        responseTime = -1;
      }

      // Get memory usage (Node.js process)
      const memUsage = process.memoryUsage();
      const memory = {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      };

      // Get uptime
      const uptime = Math.round(process.uptime());

      // Placeholder for error tracking (would integrate with logging service)
      const errors = {
        count: 0,
        recentErrors: [],
      };

      // Determine overall health status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (dbStatus === 'disconnected' || memory.percentage > 90) {
        status = 'critical';
      } else if (dbStatus === 'slow' || memory.percentage > 75) {
        status = 'warning';
      }

      return {
        status,
        database: {
          status: dbStatus,
          responseTime,
        },
        memory,
        uptime,
        errors,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      return {
        status: 'critical',
        database: { status: 'disconnected', responseTime: -1 },
        memory: { used: 0, total: 0, percentage: 0 },
        uptime: 0,
        errors: {
          count: 1,
          recentErrors: [
            {
              timestamp: new Date().toISOString(),
              message: 'Failed to get system health',
              level: 'error',
            },
          ],
        },
      };
    }
  }

  /**
   * Get content moderation queue (placeholder implementation)
   */
  async getContentModerationQueue(): Promise<ContentModerationItem[]> {
    // Placeholder implementation
    // In a real system, this would connect to a moderation queue
    return [];
  }

  /**
   * Moderate content item
   */
  async moderateContent(
    itemId: string,
    action: 'approve' | 'reject',
    moderatorUsername: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _notes?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Placeholder implementation
      // In a real system, this would update the content status
      return {
        success: true,
        message: `Content ${itemId} has been ${action}ed by ${moderatorUsername}`,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new HttpException(
        'Failed to moderate content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get user management data
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUserManagement(_options?: {
    search?: string;
    sortBy?: 'username' | 'created_at' | 'patch_count';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{
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
    try {
      // Placeholder implementation
      // In a real system, this would query users with proper filtering
      const users = [
        // Would be populated from actual user data
      ];

      return {
        users,
        total: users.length,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new HttpException(
        'Failed to get user management data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Suspend or activate user
   */
  async moderateUser(
    userId: number,
    action: 'suspend' | 'activate',
    moderatorUsername: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Placeholder implementation
      // In a real system, this would update user status
      return {
        success: true,
        message: `User ${userId} has been ${action}d by ${moderatorUsername}`,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new HttpException(
        'Failed to moderate user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get analytics data for charts and graphs
   */
  async getAnalytics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<{
    userGrowth: Array<{ date: string; count: number }>;
    patchActivity: Array<{ date: string; created: number; updated: number }>;
    categoryDistribution: Array<{ category: string; count: number }>;
    ratingDistribution: Array<{ rating: number; count: number }>;
  }> {
    try {
      // Placeholder implementation with sample data
      // In a real system, this would query actual analytics data

      const days =
        timeRange === '7d'
          ? 7
          : timeRange === '30d'
            ? 30
            : timeRange === '90d'
              ? 90
              : 365;

      const userGrowth = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        count: Math.floor(Math.random() * 10) + 1,
      }));

      const patchActivity = Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        created: Math.floor(Math.random() * 5) + 1,
        updated: Math.floor(Math.random() * 3) + 1,
      }));

      const categories = await this.patchService.getPatchCategories();
      const categoryDistribution = categories.map((cat) => ({
        category: cat.name,
        count: Math.floor(Math.random() * 50) + 10,
      }));

      const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: Math.floor(Math.random() * 100) + 10,
      }));

      return {
        userGrowth,
        patchActivity,
        categoryDistribution,
        ratingDistribution,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new HttpException(
        'Failed to get analytics data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Export data for backup or analysis
   */
  async exportData(
    type: 'users' | 'patches' | 'collections' | 'all',
    format: 'json' | 'csv' = 'json',
  ): Promise<{
    filename: string;
    data: any;
    contentType: string;
  }> {
    try {
      let data: any;
      let filename: string;

      switch (type) {
        case 'users':
          // data = await this.getAllUsersForExport();
          data = []; // Placeholder
          filename = `users_export_${Date.now()}.${format}`;
          break;
        case 'patches':
          data = await this.patchService.getAllPatches();
          filename = `patches_export_${Date.now()}.${format}`;
          break;
        case 'collections':
          data = await this.collectionRepository.getPublicCollections();
          filename = `collections_export_${Date.now()}.${format}`;
          break;
        case 'all':
          data = {
            users: [], // Would be actual user data
            patches: await this.patchService.getAllPatches(),
            collections: (
              await this.collectionRepository.getPublicCollections()
            ).items,
            exportedAt: new Date().toISOString(),
          };
          filename = `full_export_${Date.now()}.${format}`;
          break;
        default:
          throw new HttpException(
            'Invalid export type',
            HttpStatus.BAD_REQUEST,
          );
      }

      const contentType = format === 'json' ? 'application/json' : 'text/csv';

      return {
        filename,
        data: format === 'json' ? data : this.convertToCSV(data),
        contentType,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Re-throw HttpExceptions to preserve specific error messages
      if (_error instanceof HttpException) {
        throw _error;
      }
      throw new HttpException(
        'Failed to export data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Private helper methods
   */
  private async getUserStats(): Promise<AdminStats['users']> {
    // Placeholder implementation
    // In a real system, this would query actual user data
    return {
      total: 0,
      activeUsers: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
    };
  }

  private convertToCSV(data: any[]): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape CSV values that contain commas or quotes
            if (
              typeof value === 'string' &&
              (value.includes(',') || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(','),
      ),
    ].join('\n');

    return csvContent;
  }
}
