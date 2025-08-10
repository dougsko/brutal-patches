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
    it('should clear cache', () => {
      const type = 'patches';

      service.clearCache(type).subscribe(result => {
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
});