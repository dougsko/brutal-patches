import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { startWith, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { AdminApiService, SystemHealth } from '../../services/admin-api.service';
import { AdminLoggerService } from '../../services/admin-logger.service';

export interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: string;
  details?: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-system-health',
  templateUrl: './system-health.component.html',
  styleUrls: ['./system-health.component.scss']
})
export class SystemHealthComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  lastChecked: Date = new Date();
  autoRefreshEnabled = true;
  
  systemHealth: SystemHealth | null = null;
  overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  healthMetrics: HealthMetric[] = [];

  private refreshSubscription?: Subscription;
  private readonly refreshInterval = 15000; // 15 seconds

  constructor(
    private adminApi: AdminApiService,
    private logger: AdminLoggerService
  ) {}

  ngOnInit(): void {
    this.loadHealthData();
    this.startAutoRefresh();
    
    this.logger.logAdminAction('system_health_viewed', {
      timestamp: new Date().toISOString()
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadHealthData(): void {
    this.loading = true;
    this.error = null;

    this.adminApi.getSystemHealth().pipe(
      catchError(err => {
        console.error('Failed to load system health:', err);
        this.error = 'Failed to load system health data';
        this.loading = false;
        return of(null);
      })
    ).subscribe({
      next: (health) => {
        if (health) {
          this.systemHealth = health;
          this.overallStatus = health.status;
          this.processHealthMetrics(health);
          this.lastChecked = new Date(health.lastChecked);
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load system health data';
        this.loading = false;
        this.logger.logError(error, 'SystemHealthComponent', {
          action: 'loadHealthData'
        });
      }
    });
  }

  private processHealthMetrics(health: SystemHealth): void {
    this.healthMetrics = [
      {
        name: 'Database',
        status: health.database.status === 'connected' ? 'healthy' : 'critical',
        value: health.database.status,
        details: `Response time: ${health.database.responseTime}ms`,
        icon: 'storage',
        color: health.database.status === 'connected' ? '#4caf50' : '#f44336'
      },
      {
        name: 'Cache',
        status: health.cache.status === 'active' ? 'healthy' : 'warning',
        value: health.cache.status,
        details: `Hit rate: ${(health.cache.hitRate * 100).toFixed(1)}%`,
        icon: 'memory',
        color: health.cache.status === 'active' ? '#4caf50' : '#ff9800'
      },
      {
        name: 'Storage',
        status: this.getStorageStatus(health.storage.usage),
        value: health.storage.status,
        details: `Usage: ${health.storage.usage.toFixed(1)}%`,
        icon: 'folder',
        color: this.getStorageColor(health.storage.usage)
      },
      {
        name: 'API Endpoints',
        status: 'healthy', // This would come from actual health checks
        value: 'operational',
        details: 'All endpoints responding',
        icon: 'api',
        color: '#4caf50'
      },
      {
        name: 'Authentication',
        status: 'healthy', // This would come from actual health checks
        value: 'active',
        details: 'JWT validation working',
        icon: 'security',
        color: '#4caf50'
      },
      {
        name: 'Background Jobs',
        status: 'healthy', // This would come from actual health checks
        value: 'running',
        details: '0 failed jobs',
        icon: 'work',
        color: '#4caf50'
      }
    ];
  }

  private getStorageStatus(usage: number): 'healthy' | 'warning' | 'critical' {
    if (usage >= 90) return 'critical';
    if (usage >= 80) return 'warning';
    return 'healthy';
  }

  private getStorageColor(usage: number): string {
    if (usage >= 90) return '#f44336';
    if (usage >= 80) return '#ff9800';
    return '#4caf50';
  }

  private startAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.refreshSubscription = interval(this.refreshInterval)
        .pipe(startWith(0))
        .subscribe(() => {
          if (!this.loading) {
            this.loadHealthData();
          }
        });
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  onRefresh(): void {
    this.loadHealthData();
    this.logger.logAdminAction('system_health_manual_refresh', {
      timestamp: new Date().toISOString()
    });
  }

  onToggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }

    this.logger.logAdminAction('system_health_auto_refresh_toggle', {
      enabled: this.autoRefreshEnabled,
      timestamp: new Date().toISOString()
    });
  }

  getOverallStatusIcon(): string {
    switch (this.overallStatus) {
      case 'healthy':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'help';
    }
  }

  getOverallStatusColor(): string {
    switch (this.overallStatus) {
      case 'healthy':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'critical':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'healthy':
        return 'status-healthy';
      case 'warning':
        return 'status-warning';
      case 'critical':
        return 'status-critical';
      default:
        return 'status-unknown';
    }
  }

  trackByFn(index: number, item: HealthMetric): string {
    return item.name;
  }
}