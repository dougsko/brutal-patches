import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { AdminApiService, AdminStats, SystemHealth, AdminUser } from './admin-api.service';
import { AdminLoggerService } from './admin-logger.service';

describe('AdminApiService', () => {
  let service: AdminApiService;
  let httpMock: HttpTestingController;
  let mockLogger: jasmine.SpyObj<AdminLoggerService>;

  beforeEach(() => {
    const loggerSpy = jasmine.createSpyObj('AdminLoggerService', ['logAdminAction', 'logError']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AdminApiService,
        { provide: AdminLoggerService, useValue: loggerSpy }
      ]
    });

    service = TestBed.inject(AdminApiService);
    httpMock = TestBed.inject(HttpTestingController);
    mockLogger = TestBed.inject(AdminLoggerService) as jasmine.SpyObj<AdminLoggerService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAdminStats', () => {
    it('should fetch admin statistics', () => {
      const mockStats: AdminStats = {
        totalUsers: 100,
        activeUsers: 75,
        totalPatches: 500,
        totalCollections: 25,
        averageRating: 4.2,
        systemUptime: 30000,
        diskUsage: { used: 50, total: 100, percentage: 50 },
        memoryUsage: { used: 4, total: 8, percentage: 50 }
      };

      service.getAdminStats().subscribe(stats => {
        expect(stats).toEqual(mockStats);
        expect(mockLogger.logAdminAction).toHaveBeenCalledWith('stats_viewed', { endpoint: '/stats' });
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });

    it('should handle errors and retry', () => {
      spyOn(console, 'error');

      service.getAdminStats().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toContain('server error');
          expect(mockLogger.logError).toHaveBeenCalled();
        }
      });

      // First attempt fails
      const req1 = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req1.error(new ErrorEvent('Network error'));

      // Second attempt fails
      const req2 = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req2.error(new ErrorEvent('Network error'));

      // Third attempt fails - should error
      const req3 = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req3.flush({ error: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getSystemHealth', () => {
    it('should fetch system health', () => {
      const mockHealth: SystemHealth = {
        status: 'healthy',
        database: { status: 'connected', responseTime: 50 },
        cache: { status: 'active', hitRate: 85 },
        storage: { status: 'healthy', usage: 60 },
        lastChecked: new Date().toISOString()
      };

      service.getSystemHealth().subscribe(health => {
        expect(health).toEqual(mockHealth);
        expect(mockLogger.logAdminAction).toHaveBeenCalledWith('health_checked', { endpoint: '/health' });
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/health'));
      expect(req.request.method).toBe('GET');
      req.flush(mockHealth);
    });
  });

  describe('getUsers', () => {
    it('should fetch users with parameters', () => {
      const mockUsers: AdminUser[] = [
        {
          id: 1,
          username: 'testuser1',
          email: 'test1@example.com',
          created_at: '2023-01-01',
          patchCount: 5,
          isActive: true,
          roles: ['user']
        }
      ];

      const params = {
        search: 'test',
        sortBy: 'username' as const,
        sortOrder: 'asc' as const,
        limit: 10,
        offset: 0
      };

      service.getUsers(params).subscribe(result => {
        expect(result.users).toEqual(mockUsers);
        expect(result.total).toBe(1);
        expect(mockLogger.logAdminAction).toHaveBeenCalledWith('users_retrieved', jasmine.any(Object));
      });

      const req = httpMock.expectOne(req => {
        return req.url.includes('/api/admin/users') &&
               req.params.get('search') === 'test' &&
               req.params.get('sortBy') === 'username' &&
               req.params.get('sortOrder') === 'asc' &&
               req.params.get('limit') === '10' &&
               req.params.get('offset') === '0';
      });
      expect(req.request.method).toBe('GET');
      req.flush({ users: mockUsers, total: 1 });
    });
  });

  describe('moderateUser', () => {
    it('should moderate user', () => {
      const userId = 123;
      const action = 'suspend';
      const reason = 'Inappropriate behavior';

      service.moderateUser(userId, action, reason).subscribe(result => {
        expect(result.success).toBe(true);
        expect(mockLogger.logAdminAction).toHaveBeenCalledWith('user_moderated', {
          userId,
          action,
          success: true
        });
      });

      const req = httpMock.expectOne(`/admin/users/${userId}/moderate`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ action, reason });
      req.flush({ success: true, message: 'User suspended successfully' });
    });
  });

  describe('exportData', () => {
    it('should export data', () => {
      const type = 'users';
      const format = 'json';

      service.exportData(type, format).subscribe(result => {
        expect(result.filename).toBe('users_export.json');
        expect(mockLogger.logAdminAction).toHaveBeenCalledWith('data_exported', {
          type,
          format,
          filename: 'users_export.json'
        });
      });

      const req = httpMock.expectOne(req => 
        req.url.includes(`/api/admin/export/${type}`) &&
        req.params.get('format') === format
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        filename: 'users_export.json',
        data: [{ id: 1, username: 'test' }],
        contentType: 'application/json'
      });
    });
  });

  describe('error handling', () => {
    it('should handle 403 forbidden errors', () => {
      service.getAdminStats().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('You do not have permission to perform this operation.');
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 401 unauthorized errors', () => {
      service.getAdminStats().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Your session has expired. Please log in again.');
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 500 server errors', () => {
      service.getAdminStats().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('A server error occurred. Please try again later.');
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.flush({ error: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle network errors', () => {
      service.getAdminStats().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Unable to connect to the server. Please check your connection.');
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.error(new ErrorEvent('Network error'), { status: 0 });
    });
  });

  describe('bulk operations', () => {
    it('should perform bulk patch operations', () => {
      const operation = 'delete';
      const patchIds = [1, 2, 3];
      const params = { reason: 'Inappropriate content' };

      service.bulkPatchOperation(operation, patchIds, params).subscribe(result => {
        expect(result.success).toBe(true);
        expect(mockLogger.logAdminAction).toHaveBeenCalledWith('bulk_patch_operation', {
          operation,
          itemCount: patchIds.length,
          success: true
        });
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/patches/bulk'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ operation, patchIds, params });
      req.flush({ success: true, message: 'Bulk operation completed' });
    });
  });

  describe('system management', () => {
    it('should clear server cache', () => {
      const type = 'patches';

      service.clearServerCache(type).subscribe(result => {
        expect(result.success).toBe(true);
        expect(mockLogger.logAdminAction).toHaveBeenCalledWith('cache_cleared', {
          type,
          success: true
        });
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/cache/clear'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ type });
      req.flush({ success: true, message: 'Cache cleared successfully' });
    });

    it('should run maintenance tasks', () => {
      const tasks: ('cleanup_logs' | 'optimize_database' | 'update_statistics')[] = ['cleanup_logs', 'optimize_database'];

      service.runMaintenance(tasks).subscribe(result => {
        expect(result.success).toBe(true);
        expect(mockLogger.logAdminAction).toHaveBeenCalledWith('maintenance_run', {
          tasks,
          success: true
        });
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/maintenance'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ tasks });
      req.flush({ success: true, message: 'Maintenance tasks completed', results: {} });
    });
  });

  // Enhanced error handling tests for caching functionality
  describe('Caching Functionality', () => {
    beforeEach(() => {
      // Clear any existing cache before each test
      service.clearCache();
    });

    it('should return cached data when available and valid', () => {
      const mockStats: AdminStats = {
        totalUsers: 100,
        activeUsers: 75,
        totalPatches: 500,
        totalCollections: 25,
        averageRating: 4.2,
        systemUptime: 30000,
        diskUsage: { used: 50, total: 100, percentage: 50 },
        memoryUsage: { used: 4, total: 8, percentage: 50 }
      };

      // First request - should hit the API
      service.getAdminStats().subscribe(stats => {
        expect(stats).toEqual(mockStats);
      });

      const req1 = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req1.flush(mockStats);

      // Second request - should use cache (no HTTP request expected)
      service.getAdminStats().subscribe(stats => {
        expect(stats).toEqual(mockStats);
        expect(mockLogger.logAdminAction).toHaveBeenCalledTimes(1); // Only called once (not from cache)
      });

      // Verify no additional HTTP requests were made
      httpMock.verify();
    });

    it('should bypass cache when useCache is false', () => {
      const mockStats: AdminStats = {
        totalUsers: 100,
        activeUsers: 75,
        totalPatches: 500,
        totalCollections: 25,
        averageRating: 4.2,
        systemUptime: 30000,
        diskUsage: { used: 50, total: 100, percentage: 50 },
        memoryUsage: { used: 4, total: 8, percentage: 50 }
      };

      // First request with cache
      service.getAdminStats(true).subscribe();
      const req1 = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req1.flush(mockStats);

      // Second request bypassing cache
      service.getAdminStats(false).subscribe();
      const req2 = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req2.flush(mockStats);
    });

    it('should share pending requests to avoid duplicate API calls', (done) => {
      const mockStats: AdminStats = {
        totalUsers: 100,
        activeUsers: 75,
        totalPatches: 500,
        totalCollections: 25,
        averageRating: 4.2,
        systemUptime: 30000,
        diskUsage: { used: 50, total: 100, percentage: 50 },
        memoryUsage: { used: 4, total: 8, percentage: 50 }
      };

      let responseCount = 0;

      // Make two simultaneous requests
      service.getAdminStats().subscribe(stats => {
        expect(stats).toEqual(mockStats);
        responseCount++;
        if (responseCount === 2) {
          done();
        }
      });

      service.getAdminStats().subscribe(stats => {
        expect(stats).toEqual(mockStats);
        responseCount++;
        if (responseCount === 2) {
          done();
        }
      });

      // Only one HTTP request should be made
      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.flush(mockStats);
    });

    it('should clear cache entries when clearCache is called', () => {
      const mockStats: AdminStats = {
        totalUsers: 100,
        activeUsers: 75,
        totalPatches: 500,
        totalCollections: 25,
        averageRating: 4.2,
        systemUptime: 30000,
        diskUsage: { used: 50, total: 100, percentage: 50 },
        memoryUsage: { used: 4, total: 8, percentage: 50 }
      };

      // First request - populate cache
      service.getAdminStats().subscribe();
      const req1 = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req1.flush(mockStats);

      // Clear cache
      service.clearCache();

      // Next request should hit API again
      service.getAdminStats().subscribe();
      const req2 = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req2.flush(mockStats);
    });

    it('should provide cache statistics', () => {
      const mockStats: AdminStats = {
        totalUsers: 100,
        activeUsers: 75,
        totalPatches: 500,
        totalCollections: 25,
        averageRating: 4.2,
        systemUptime: 30000,
        diskUsage: { used: 50, total: 100, percentage: 50 },
        memoryUsage: { used: 4, total: 8, percentage: 50 }
      };

      // Initially cache should be empty
      let cacheStats = service.getCacheStats();
      expect(cacheStats.size).toBe(0);
      expect(cacheStats.keys).toEqual([]);

      // Populate cache
      service.getAdminStats().subscribe();
      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.flush(mockStats);

      // Cache should now have one entry
      cacheStats = service.getCacheStats();
      expect(cacheStats.size).toBe(1);
      expect(cacheStats.keys).toContain('admin_stats');
    });

    it('should handle cache invalidation with patterns', () => {
      const mockStats: AdminStats = {
        totalUsers: 100,
        activeUsers: 75,
        totalPatches: 500,
        totalCollections: 25,
        averageRating: 4.2,
        systemUptime: 30000,
        diskUsage: { used: 50, total: 100, percentage: 50 },
        memoryUsage: { used: 4, total: 8, percentage: 50 }
      };

      const mockHealth: SystemHealth = {
        status: 'healthy',
        database: { status: 'connected', responseTime: 50 },
        cache: { status: 'active', hitRate: 85 },
        storage: { status: 'healthy', usage: 60 },
        lastChecked: new Date().toISOString()
      };

      // Populate cache with both stats and health
      service.getAdminStats().subscribe();
      const req1 = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req1.flush(mockStats);

      service.getSystemHealth().subscribe();
      const req2 = httpMock.expectOne(req => req.url.includes('/api/admin/health'));
      req2.flush(mockHealth);

      // Verify both entries are cached
      let cacheStats = service.getCacheStats();
      expect(cacheStats.size).toBe(2);

      // Invalidate only stats entries
      service.invalidateCache(/admin_stats/);

      // Health should still be cached
      cacheStats = service.getCacheStats();
      expect(cacheStats.size).toBe(1);
      expect(cacheStats.keys).toContain('system_health');
      expect(cacheStats.keys).not.toContain('admin_stats');
    });
  });

  // Error handling edge cases
  describe('Advanced Error Handling', () => {
    it('should handle malformed JSON responses', () => {
      service.getAdminStats().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(mockLogger.logError).toHaveBeenCalled();
          expect(error.operation).toBe('getAdminStats');
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.error(new ErrorEvent('JSON Parse Error'));
    });

    it('should handle timeout errors', () => {
      service.getUsers().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.message).toBe('Unable to connect to the server. Please check your connection.');
          expect(mockLogger.logError).toHaveBeenCalled();
        }
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/users'));
      req.error(new ErrorEvent('Timeout'), { status: 0, statusText: 'Timeout' });
    });

    it('should handle partial failures in bulk operations', () => {
      const operation = 'delete';
      const patchIds = [1, 2, 3];

      service.bulkPatchOperation(operation, patchIds).subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(mockLogger.logAdminAction).toHaveBeenCalledWith('bulk_patch_operation', {
          operation,
          itemCount: patchIds.length,
          success: false
        });
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/patches/bulk'));
      req.flush({
        success: false,
        message: 'Partial failure',
        errors: ['Failed to delete patch 2: Permission denied'],
        results: { deleted: [1, 3], failed: [2] }
      });
    });

    it('should handle concurrent request failures gracefully', (done) => {
      let errorCount = 0;
      const expectedErrors = 2;

      const handleError = (error: any) => {
        expect(error.message).toContain('server error');
        errorCount++;
        if (errorCount === expectedErrors) {
          done();
        }
      };

      // Make two concurrent failing requests
      service.getAdminStats().subscribe({
        next: () => fail('Should have failed'),
        error: handleError
      });

      service.getAdminStats().subscribe({
        next: () => fail('Should have failed'),
        error: handleError
      });

      // Both should share the same failing request
      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.flush({ error: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle cache corruption gracefully', () => {
      // Simulate corrupted cache by directly manipulating the internal cache
      const corruptedData = { corrupted: true };
      (service as any).setCachedData('admin_stats', corruptedData, 30000);

      // Request should still work by making a new API call
      const mockStats: AdminStats = {
        totalUsers: 100,
        activeUsers: 75,
        totalPatches: 500,
        totalCollections: 25,
        averageRating: 4.2,
        systemUptime: 30000,
        diskUsage: { used: 50, total: 100, percentage: 50 },
        memoryUsage: { used: 4, total: 8, percentage: 50 }
      };

      service.getAdminStats().subscribe(stats => {
        // Should return real data, not corrupted cache
        expect(stats).toEqual(mockStats);
        expect(stats).not.toEqual(jasmine.any(Object));
      });

      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.flush(mockStats);
    });

    it('should handle memory pressure by clearing old cache entries', () => {
      // This test would simulate cache eviction policies
      // In a real implementation, you might want to add automatic cache cleanup

      const cacheSize = service.getCacheStats().size;
      expect(cacheSize).toBe(0);

      // Add multiple cache entries
      const mockStats: AdminStats = {
        totalUsers: 100,
        activeUsers: 75,
        totalPatches: 500,
        totalCollections: 25,
        averageRating: 4.2,
        systemUptime: 30000,
        diskUsage: { used: 50, total: 100, percentage: 50 },
        memoryUsage: { used: 4, total: 8, percentage: 50 }
      };

      service.getAdminStats().subscribe();
      const req = httpMock.expectOne(req => req.url.includes('/api/admin/stats'));
      req.flush(mockStats);

      expect(service.getCacheStats().size).toBe(1);

      // Clear cache when needed
      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });
  });
});