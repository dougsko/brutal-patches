import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, retry, tap, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AdminLoggerService } from './admin-logger.service';

// Admin API interfaces
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPatches: number;
  totalCollections: number;
  averageRating: number;
  systemUptime: number;
  diskUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
  };
  cache: {
    status: 'active' | 'inactive';
    hitRate: number;
  };
  storage: {
    status: 'healthy' | 'warning' | 'full';
    usage: number;
  };
  lastChecked: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  created_at: string;
  patchCount: number;
  isActive: boolean;
  lastLogin?: string;
  roles: string[];
}

export interface ContentModerationItem {
  id: string;
  type: 'patch' | 'comment' | 'user_profile';
  title: string;
  content: string;
  author: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reports: number;
  priority: 'low' | 'medium' | 'high';
}

export interface AnalyticsData {
  userGrowth: Array<{ date: string; count: number }>;
  patchActivity: Array<{ date: string; created: number; updated: number }>;
  categoryDistribution: Array<{ category: string; count: number }>;
  ratingDistribution: Array<{ rating: number; count: number }>;
}

export interface ExportData {
  filename: string;
  data: any;
  contentType: string;
}

export interface BulkOperationResult {
  success: boolean;
  message: string;
  results?: any;
  errors?: string[];
}

export interface AdminLog {
  id: string;
  timestamp: string;
  type: 'action' | 'system' | 'error';
  message: string;
  user?: string;
  metadata?: any;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxUploadSize: number;
  rateLimit: {
    windowMs: number;
    max: number;
  };
  [key: string]: any;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin`;
  
  private readonly defaultHeaders = new HttpHeaders({
    'Content-Type': 'application/json'
  });

  // Cache configuration
  private readonly CACHE_DURATION = {
    stats: 30 * 1000, // 30 seconds for dashboard stats
    health: 15 * 1000, // 15 seconds for health data
    settings: 5 * 60 * 1000 // 5 minutes for settings
  };

  // Cache storage
  private cache = new Map<string, CachedData<any>>();
  
  // Observables for shared requests
  private pendingRequests = new Map<string, Observable<any>>();

  constructor(
    private http: HttpClient,
    private logger: AdminLoggerService
  ) {}

  // Dashboard & Statistics
  getAdminStats(useCache: boolean = true): Observable<AdminStats> {
    const cacheKey = 'admin_stats';
    
    if (useCache) {
      const cachedData = this.getCachedData<AdminStats>(cacheKey);
      if (cachedData) {
        return of(cachedData);
      }

      // Check if request is already pending to avoid duplicate requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey)!;
      }
    }

    const request$ = this.http.get<AdminStats>(`${this.baseUrl}/stats`).pipe(
      tap((data) => {
        this.logger.logAdminAction('stats_viewed', { endpoint: '/stats' });
        if (useCache) {
          this.setCachedData(cacheKey, data, this.CACHE_DURATION.stats);
        }
      }),
      retry(2),
      catchError(this.handleError('getAdminStats')),
      shareReplay(1)
    );

    if (useCache) {
      this.pendingRequests.set(cacheKey, request$);
      
      // Clean up pending request after completion
      request$.subscribe({
        complete: () => this.pendingRequests.delete(cacheKey),
        error: () => this.pendingRequests.delete(cacheKey)
      });
    }

    return request$;
  }

  getSystemHealth(useCache: boolean = true): Observable<SystemHealth> {
    const cacheKey = 'system_health';
    
    if (useCache) {
      const cachedData = this.getCachedData<SystemHealth>(cacheKey);
      if (cachedData) {
        return of(cachedData);
      }

      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey)!;
      }
    }

    const request$ = this.http.get<SystemHealth>(`${this.baseUrl}/health`).pipe(
      tap((data) => {
        this.logger.logAdminAction('health_checked', { endpoint: '/health' });
        if (useCache) {
          this.setCachedData(cacheKey, data, this.CACHE_DURATION.health);
        }
      }),
      retry(2),
      catchError(this.handleError('getSystemHealth')),
      shareReplay(1)
    );

    if (useCache) {
      this.pendingRequests.set(cacheKey, request$);
      request$.subscribe({
        complete: () => this.pendingRequests.delete(cacheKey),
        error: () => this.pendingRequests.delete(cacheKey)
      });
    }

    return request$;
  }

  // User Management
  getUsers(params: {
    search?: string;
    sortBy?: 'username' | 'created_at' | 'patch_count';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Observable<{ users: AdminUser[], total: number }> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key as keyof typeof params] !== undefined) {
        httpParams = httpParams.set(key, String(params[key as keyof typeof params]));
      }
    });

    return this.http.get<{ users: AdminUser[], total: number }>(`${this.baseUrl}/users`, { params: httpParams }).pipe(
      tap(result => this.logger.logAdminAction('users_retrieved', { 
        count: result.users.length, 
        search: params.search 
      })),
      retry(2),
      catchError(this.handleError('getUsers'))
    );
  }

  moderateUser(userId: number, action: 'suspend' | 'activate', reason?: string): Observable<BulkOperationResult> {
    const body = { action, reason };
    
    return this.http.put<BulkOperationResult>(`${this.baseUrl}/users/${userId}/moderate`, body).pipe(
      tap(result => this.logger.logAdminAction('user_moderated', { 
        userId, 
        action, 
        success: result.success 
      })),
      catchError(this.handleError('moderateUser'))
    );
  }

  // Content Moderation
  getContentModerationQueue(): Observable<ContentModerationItem[]> {
    return this.http.get<ContentModerationItem[]>(`${this.baseUrl}/moderation/queue`).pipe(
      tap(items => this.logger.logAdminAction('moderation_queue_viewed', { 
        itemCount: items.length 
      })),
      retry(2),
      catchError(this.handleError('getContentModerationQueue'))
    );
  }

  moderateContent(itemId: string, action: 'approve' | 'reject', notes?: string): Observable<BulkOperationResult> {
    const body = { action, notes };
    
    return this.http.put<BulkOperationResult>(`${this.baseUrl}/moderation/${itemId}`, body).pipe(
      tap(result => this.logger.logAdminAction('content_moderated', { 
        itemId, 
        action, 
        success: result.success 
      })),
      catchError(this.handleError('moderateContent'))
    );
  }

  // Analytics
  getAnalytics(timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Observable<AnalyticsData> {
    const params = new HttpParams().set('timeRange', timeRange);
    
    return this.http.get<AnalyticsData>(`${this.baseUrl}/analytics`, { params }).pipe(
      tap(() => this.logger.logAdminAction('analytics_viewed', { timeRange })),
      retry(2),
      catchError(this.handleError('getAnalytics'))
    );
  }

  // Data Export
  exportData(type: 'users' | 'patches' | 'collections' | 'all', format: 'json' | 'csv' = 'json'): Observable<ExportData> {
    const params = new HttpParams().set('format', format);
    
    return this.http.get<ExportData>(`${this.baseUrl}/export/${type}`, { params }).pipe(
      tap(result => this.logger.logAdminAction('data_exported', { 
        type, 
        format, 
        filename: result.filename 
      })),
      catchError(this.handleError('exportData'))
    );
  }

  // Bulk Operations
  bulkPatchOperation(operation: 'delete' | 'export' | 'moderate', patchIds: number[], params?: any): Observable<BulkOperationResult> {
    const body = { operation, patchIds, params };
    
    return this.http.post<BulkOperationResult>(`${this.baseUrl}/patches/bulk`, body).pipe(
      tap(result => this.logger.logAdminAction('bulk_patch_operation', { 
        operation, 
        itemCount: patchIds.length, 
        success: result.success 
      })),
      catchError(this.handleError('bulkPatchOperation'))
    );
  }

  // System Logs
  getAdminLogs(params: {
    type?: 'action' | 'system' | 'error';
    limit?: number;
    offset?: number;
  } = {}): Observable<{ logs: AdminLog[], total: number }> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key as keyof typeof params] !== undefined) {
        httpParams = httpParams.set(key, String(params[key as keyof typeof params]));
      }
    });

    return this.http.get<{ logs: AdminLog[], total: number }>(`${this.baseUrl}/logs`, { params: httpParams }).pipe(
      tap(result => this.logger.logAdminAction('admin_logs_viewed', { 
        type: params.type, 
        count: result.logs.length 
      })),
      retry(2),
      catchError(this.handleError('getAdminLogs'))
    );
  }

  // System Settings
  getSystemSettings(): Observable<SystemSettings> {
    return this.http.get<SystemSettings>(`${this.baseUrl}/settings`).pipe(
      tap(() => this.logger.logAdminAction('settings_viewed', {})),
      retry(2),
      catchError(this.handleError('getSystemSettings'))
    );
  }

  updateSystemSettings(settings: Partial<SystemSettings>): Observable<BulkOperationResult> {
    return this.http.put<BulkOperationResult>(`${this.baseUrl}/settings`, settings).pipe(
      tap(result => this.logger.logAdminAction('settings_updated', { 
        success: result.success, 
        settingsKeys: Object.keys(settings) 
      })),
      catchError(this.handleError('updateSystemSettings'))
    );
  }

  // Cache Management
  clearServerCache(type?: 'patches' | 'users' | 'collections' | 'all'): Observable<BulkOperationResult> {
    const body = { type: type || 'all' };
    
    return this.http.post<BulkOperationResult>(`${this.baseUrl}/cache/clear`, body).pipe(
      tap(result => this.logger.logAdminAction('cache_cleared', { 
        type: type || 'all', 
        success: result.success 
      })),
      catchError(this.handleError('clearServerCache'))
    );
  }

  // Maintenance Tasks
  runMaintenance(tasks: ('cleanup_logs' | 'optimize_database' | 'update_statistics')[]): Observable<BulkOperationResult> {
    const body = { tasks };
    
    return this.http.post<BulkOperationResult>(`${this.baseUrl}/maintenance`, body).pipe(
      tap(result => this.logger.logAdminAction('maintenance_run', { 
        tasks, 
        success: result.success 
      })),
      catchError(this.handleError('runMaintenance'))
    );
  }

  // Patch Statistics (for dashboard)
  getPatchStats(): Observable<{
    totalPatches: number;
    averageRating: number;
    topCategories: Array<{ category: string; count: number }>;
  }> {
    return this.http.get<any>(`${this.baseUrl}/patches/stats`).pipe(
      tap(() => this.logger.logAdminAction('patch_stats_viewed', {})),
      retry(2),
      catchError(this.handleError('getPatchStats'))
    );
  }

  // Collection Statistics (for dashboard)
  getCollectionStats(): Observable<{
    totalCollections: number;
    publicCollections: number;
    privateCollections: number;
    averagePatchCount: number;
  }> {
    return this.http.get<any>(`${this.baseUrl}/collections/stats`).pipe(
      tap(() => this.logger.logAdminAction('collection_stats_viewed', {})),
      retry(2),
      catchError(this.handleError('getCollectionStats'))
    );
  }

  private handleError<T>(operation = 'operation') {
    return (error: HttpErrorResponse): Observable<never> => {
      // Log error details
      this.logger.logError(
        new Error(`Admin API operation '${operation}' failed`),
        'AdminApiService',
        {
          operation,
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        }
      );

      // User-friendly error message
      let errorMessage = 'An error occurred while performing this operation.';
      
      if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this operation.';
      } else if (error.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (error.status === 500) {
        errorMessage = 'A server error occurred. Please try again later.';
      } else if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your connection.';
      }

      return throwError(() => ({
        message: errorMessage,
        originalError: error,
        operation
      }));
    };
  }

  // Cache management methods
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if data is still valid
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData<T>(key: string, data: T, duration: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + duration
    });
  }

  /**
   * Clear all cached data or specific cache keys
   */
  public clearCache(keys?: string[]): void {
    if (keys) {
      keys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
      this.pendingRequests.clear();
    }
    
    this.logger.logAdminAction('cache_cleared', { 
      keys: keys || ['all'],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): { size: number; keys: string[]; hitRate?: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Invalidate cache entries that match a pattern
   */
  public invalidateCache(pattern?: RegExp): void {
    if (!pattern) {
      this.clearCache();
      return;
    }

    const keysToDelete = Array.from(this.cache.keys())
      .filter(key => pattern.test(key));
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    this.logger.logAdminAction('cache_invalidated', {
      pattern: pattern.toString(),
      keysRemoved: keysToDelete,
      timestamp: new Date().toISOString()
    });
  }
}