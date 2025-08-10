import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription, forkJoin } from 'rxjs';
import { startWith, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { AdminApiService, AdminStats, AnalyticsData } from '../../services/admin-api.service';
import { AdminLoggerService } from '../../services/admin-logger.service';
import { AdminDashboardCard, TimeSeriesData, CategoryData } from '../../interfaces/admin.interfaces';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  lastUpdated: Date = new Date();
  autoRefreshEnabled = true;
  refreshInterval = 30; // seconds

  // Data properties
  statsCards: AdminDashboardCard[] = [];
  userGrowthData: TimeSeriesData[] = [];
  patchActivityData: TimeSeriesData[] = [];
  categoryDistribution: CategoryData[] = [];
  ratingDistribution: CategoryData[] = [];

  // Statistics
  totalUsers = 0;
  activeUsers = 0;
  totalPatches = 0;
  systemUptime = 0;
  averageRating = 0;
  newUsersToday = 0;
  newPatchesToday = 0;

  private refreshSubscription?: Subscription;

  constructor(
    private adminApi: AdminApiService,
    private logger: AdminLoggerService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.startAutoRefresh();
    
    this.logger.logAdminAction('dashboard_viewed', {
      timestamp: new Date().toISOString()
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      stats: this.adminApi.getAdminStats().pipe(
        catchError(err => {
          console.error('Failed to load admin stats:', err);
          return of(null);
        })
      ),
      analytics: this.adminApi.getAnalytics('30d').pipe(
        catchError(err => {
          console.error('Failed to load analytics:', err);
          return of(null);
        })
      )
    }).subscribe({
      next: (results) => {
        if (results.stats) {
          this.processStatsData(results.stats);
        }
        if (results.analytics) {
          this.processAnalyticsData(results.analytics);
        }
        this.createStatsCards();
        this.loading = false;
        this.lastUpdated = new Date();
      },
      error: (error) => {
        this.error = 'Failed to load dashboard data';
        this.loading = false;
        this.logger.logError(error, 'DashboardComponent', {
          action: 'loadDashboardData'
        });
      }
    });
  }

  private processStatsData(stats: AdminStats): void {
    this.totalUsers = stats.totalUsers;
    this.activeUsers = stats.activeUsers;
    this.totalPatches = stats.totalPatches;
    this.systemUptime = stats.systemUptime;
    this.averageRating = stats.averageRating;

    // These would come from more detailed stats in a real implementation
    this.newUsersToday = Math.floor(stats.totalUsers * 0.01); // Mock data
    this.newPatchesToday = Math.floor(stats.totalPatches * 0.02); // Mock data
  }

  private processAnalyticsData(analytics: AnalyticsData): void {
    this.userGrowthData = analytics.userGrowth.map(item => ({
      date: item.date,
      value: item.count,
      label: 'New Users'
    }));
    this.patchActivityData = analytics.patchActivity.map(item => ({
      date: item.date,
      value: item.created,
      label: 'New Patches'
    }));
    this.categoryDistribution = analytics.categoryDistribution.map(item => ({
      ...item,
      percentage: 0 // Will be calculated by chart component
    }));
    this.ratingDistribution = analytics.ratingDistribution.map(item => ({
      category: `${item.rating} Star${item.rating !== 1 ? 's' : ''}`,
      count: item.count,
      percentage: 0 // Will be calculated by the chart component
    }));
  }

  private createStatsCards(): void {
    this.statsCards = [
      {
        title: 'Total Users',
        value: this.totalUsers,
        icon: 'people',
        color: 'primary',
        trend: {
          direction: 'up',
          percentage: 12.5,
          period: 'last 30 days'
        },
        link: '/admin/users'
      },
      {
        title: 'Active Users',
        value: this.activeUsers,
        icon: 'person_online',
        color: 'accent',
        trend: {
          direction: 'up',
          percentage: 8.3,
          period: 'last 30 days'
        },
        link: '/admin/users?filter=active'
      },
      {
        title: 'Total Patches',
        value: this.totalPatches,
        icon: 'library_music',
        color: 'primary',
        trend: {
          direction: 'up',
          percentage: 15.2,
          period: 'last 30 days'
        },
        link: '/admin/patches'
      },
      {
        title: 'Average Rating',
        value: this.averageRating.toFixed(1),
        icon: 'star',
        color: 'accent',
        trend: {
          direction: 'up',
          percentage: 2.1,
          period: 'last 30 days'
        }
      },
      {
        title: 'New Users Today',
        value: this.newUsersToday,
        icon: 'person_add',
        color: 'primary',
        trend: {
          direction: 'neutral',
          percentage: 0,
          period: 'yesterday'
        }
      },
      {
        title: 'New Patches Today',
        value: this.newPatchesToday,
        icon: 'add_circle',
        color: 'accent',
        trend: {
          direction: 'up',
          percentage: 25.0,
          period: 'yesterday'
        }
      },
      {
        title: 'System Uptime',
        value: this.formatUptime(this.systemUptime),
        icon: 'schedule',
        color: 'accent',
        trend: {
          direction: 'neutral',
          percentage: 0,
          period: 'stable'
        }
      },
      {
        title: 'Pending Reviews',
        value: 3,
        icon: 'gavel',
        color: 'warn',
        trend: {
          direction: 'down',
          percentage: 40,
          period: 'last week'
        },
        link: '/admin/moderation'
      }
    ];
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  }

  private startAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.refreshSubscription = interval(this.refreshInterval * 1000)
        .pipe(startWith(0))
        .subscribe(() => {
          if (!this.loading) {
            this.loadDashboardData();
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
    this.loadDashboardData();
    this.logger.logAdminAction('dashboard_manual_refresh', {
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

    this.logger.logAdminAction('dashboard_auto_refresh_toggle', {
      enabled: this.autoRefreshEnabled,
      timestamp: new Date().toISOString()
    });
  }

  onRefreshIntervalChange(interval: number): void {
    this.refreshInterval = interval;
    
    if (this.autoRefreshEnabled) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
    }

    this.logger.logAdminAction('dashboard_refresh_interval_changed', {
      interval: interval,
      timestamp: new Date().toISOString()
    });
  }

  trackByFn(index: number, item: AdminDashboardCard): string {
    return item.title;
  }
}