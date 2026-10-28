import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { interval, Subscription, combineLatest } from 'rxjs';
import { startWith, catchError, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';

import { SubscriptionBaseComponent } from '../../../core/components';

import { AdminApiService, AnalyticsData } from '../../services/admin-api.service';
import { AdminLoggerService } from '../../services/admin-logger.service';
import { 
  TimeSeriesData, 
  CategoryData, 
  AnalyticsFilter, 
  UserGrowthData, 
  ContentAnalytics 
} from '../../interfaces/admin.interfaces';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent extends SubscriptionBaseComponent implements OnInit {
  loading = true;
  error: string | null = null;
  lastUpdated: Date = new Date();
  autoRefreshEnabled = false; // Disabled by default for analytics
  
  // Form controls
  timeRangeControl = new FormControl('30d');
  categoryControl = new FormControl('all');
  userSegmentControl = new FormControl('all');
  
  // Analytics data
  analyticsData: AnalyticsData | null = null;
  userGrowthData: TimeSeriesData[] = [];
  patchActivityData: TimeSeriesData[] = [];
  patchUpdateData: TimeSeriesData[] = [];
  categoryDistribution: CategoryData[] = [];
  ratingDistribution: CategoryData[] = [];
  
  // Summary statistics
  totalUserGrowth = 0;
  totalPatchesCreated = 0;
  averageRating = 0;
  mostPopularCategory = '';
  
  // Filter options
  timeRangeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 3 Months' },
    { value: '1y', label: 'Last Year' }
  ];

  categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'bass', label: 'Bass' },
    { value: 'lead', label: 'Lead' },
    { value: 'pad', label: 'Pad' },
    { value: 'arp', label: 'Arp' },
    { value: 'sequence', label: 'Sequence' },
    { value: 'fx', label: 'FX' }
  ];

  userSegmentOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'new', label: 'New Users' },
    { value: 'active', label: 'Active Users' },
    { value: 'inactive', label: 'Inactive Users' }
  ];

  private refreshSubscription?: Subscription;
  private filterSubscription?: Subscription;
  private readonly refreshInterval = 60000; // 1 minute

  constructor(
    private adminApi: AdminApiService,
    private logger: AdminLoggerService
  ) {
    super();
  }

  ngOnInit(): void {
    this.setupFilterSubscriptions();
    this.loadAnalyticsData();
    
    this.logger.logAdminAction('analytics_viewed', {
      timestamp: new Date().toISOString()
    });
  }

  override ngOnDestroy(): void {
    this.stopAutoRefresh();
    // filterSubscription will be automatically unsubscribed via takeUntil(destroy$)
    super.ngOnDestroy();
  }

  private setupFilterSubscriptions(): void {
    this.filterSubscription = combineLatest([
      this.timeRangeControl.valueChanges.pipe(startWith('30d')),
      this.categoryControl.valueChanges.pipe(startWith('all')),
      this.userSegmentControl.valueChanges.pipe(startWith('all'))
    ]).pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.isComponentActive()) {
        this.loadAnalyticsData();
      }
    });
  }

  loadAnalyticsData(): void {
    this.loading = true;
    this.error = null;

    const timeRange = this.timeRangeControl.value as '7d' | '30d' | '90d' | '1y';

    this.adminApi.getAnalytics(timeRange).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Failed to load analytics:', err);
        this.error = 'Failed to load analytics data';
        this.loading = false;
        return of(null);
      })
    ).subscribe({
      next: (data) => {
        if (!this.isComponentActive()) return;
        
        if (data) {
          this.analyticsData = data;
          this.processAnalyticsData(data);
          this.calculateSummaryStats(data);
        }
        this.loading = false;
        this.lastUpdated = new Date();
      },
      error: (error) => {
        this.error = 'Failed to load analytics data';
        this.loading = false;
        this.logger.logError(error, 'AnalyticsComponent', {
          action: 'loadAnalyticsData',
          timeRange: timeRange
        });
      }
    });
  }

  private processAnalyticsData(data: AnalyticsData): void {
    // Process user growth data
    this.userGrowthData = data.userGrowth.map(item => ({
      date: item.date,
      value: item.count,
      label: 'New Users'
    }));

    // Process patch activity data
    this.patchActivityData = data.patchActivity.map(item => ({
      date: item.date,
      value: item.created,
      label: 'Patches Created'
    }));

    this.patchUpdateData = data.patchActivity.map(item => ({
      date: item.date,
      value: item.updated,
      label: 'Patches Updated'
    }));

    // Process category distribution
    this.categoryDistribution = data.categoryDistribution.map(item => ({
      ...item,
      percentage: 0 // Will be calculated by chart component
    }));

    // Process rating distribution
    this.ratingDistribution = data.ratingDistribution.map(item => ({
      category: `${item.rating} Star${item.rating !== 1 ? 's' : ''}`,
      count: item.count,
      percentage: 0 // Will be calculated by chart component
    }));
  }

  private calculateSummaryStats(data: AnalyticsData): void {
    // Calculate total user growth
    this.totalUserGrowth = data.userGrowth.reduce((sum, item) => sum + item.count, 0);

    // Calculate total patches created
    this.totalPatchesCreated = data.patchActivity.reduce((sum, item) => sum + item.created, 0);

    // Calculate average rating
    const totalRatings = data.ratingDistribution.reduce((sum, item) => sum + item.count, 0);
    const weightedSum = data.ratingDistribution.reduce((sum, item) => sum + (item.rating * item.count), 0);
    this.averageRating = totalRatings > 0 ? weightedSum / totalRatings : 0;

    // Find most popular category
    if (data.categoryDistribution.length > 0) {
      const topCategory = data.categoryDistribution.reduce((prev, current) => 
        current.count > prev.count ? current : prev
      );
      this.mostPopularCategory = topCategory.category;
    }
  }

  private startAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.refreshSubscription = interval(this.refreshInterval)
        .pipe(
          startWith(0),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          if (!this.loading && this.isComponentActive()) {
            this.loadAnalyticsData();
          }
        });
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  onRefresh(): void {
    this.loadAnalyticsData();
    this.logger.logAdminAction('analytics_manual_refresh', {
      timeRange: this.timeRangeControl.value,
      category: this.categoryControl.value,
      userSegment: this.userSegmentControl.value,
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

    this.logger.logAdminAction('analytics_auto_refresh_toggle', {
      enabled: this.autoRefreshEnabled,
      timestamp: new Date().toISOString()
    });
  }

  onExportData(): void {
    if (!this.analyticsData) return;

    const exportData = {
      timeRange: this.timeRangeControl.value,
      category: this.categoryControl.value,
      userSegment: this.userSegmentControl.value,
      generatedAt: new Date().toISOString(),
      data: this.analyticsData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${this.timeRangeControl.value}-${Date.now()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.logger.logAdminAction('analytics_data_exported', {
      timeRange: this.timeRangeControl.value,
      timestamp: new Date().toISOString()
    });
  }

  getGrowthPercentage(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '+∞' : '0';
    const percentage = ((current - previous) / previous) * 100;
    return percentage > 0 ? `+${percentage.toFixed(1)}` : percentage.toFixed(1);
  }

  getGrowthDirection(current: number, previous: number): 'up' | 'down' | 'neutral' {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  }
}