import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of, throwError } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { AdminApiService, AdminStats, AnalyticsData } from '../../services/admin-api.service';
import { AdminLoggerService } from '../../services/admin-logger.service';
import { StatsCardComponent } from '../stats-card/stats-card.component';
import { LineChartComponent } from '../charts/line-chart.component';
import { DonutChartComponent } from '../charts/donut-chart.component';
import { BarChartComponent } from '../charts/bar-chart.component';
import { BaseChartComponent } from '../charts/base-chart.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockAdminApiService: jasmine.SpyObj<AdminApiService>;
  let mockAdminLoggerService: jasmine.SpyObj<AdminLoggerService>;

  const mockAdminStats: AdminStats = {
    totalUsers: 1250,
    activeUsers: 850,
    totalPatches: 3200,
    totalCollections: 450,
    averageRating: 4.2,
    systemUptime: 604800, // 7 days in seconds
    diskUsage: { used: 75, total: 100, percentage: 75 },
    memoryUsage: { used: 8, total: 16, percentage: 50 }
  };

  const mockAnalyticsData: AnalyticsData = {
    userGrowth: [
      { date: '2024-01-01', count: 10 },
      { date: '2024-01-02', count: 15 },
      { date: '2024-01-03', count: 8 }
    ],
    patchActivity: [
      { date: '2024-01-01', created: 25, updated: 10 },
      { date: '2024-01-02', created: 30, updated: 15 },
      { date: '2024-01-03', created: 20, updated: 8 }
    ],
    categoryDistribution: [
      { category: 'bass', count: 120 },
      { category: 'lead', count: 95 },
      { category: 'pad', count: 80 }
    ],
    ratingDistribution: [
      { rating: 5, count: 100 },
      { rating: 4, count: 80 },
      { rating: 3, count: 30 }
    ]
  };

  beforeEach(async () => {
    const adminApiSpy = jasmine.createSpyObj('AdminApiService', [
      'getAdminStats',
      'getAnalytics'
    ]);

    const loggerSpy = jasmine.createSpyObj('AdminLoggerService', [
      'logAdminAction',
      'logError'
    ]);

    await TestBed.configureTestingModule({
      declarations: [
        DashboardComponent,
        StatsCardComponent,
        LineChartComponent,
        DonutChartComponent,
        BarChartComponent,
        BaseChartComponent
      ],
      imports: [
        NoopAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
        MatSelectModule,
        MatFormFieldModule,
        MatTooltipModule
      ],
      providers: [
        { provide: AdminApiService, useValue: adminApiSpy },
        { provide: AdminLoggerService, useValue: loggerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    mockAdminApiService = TestBed.inject(AdminApiService) as jasmine.SpyObj<AdminApiService>;
    mockAdminLoggerService = TestBed.inject(AdminLoggerService) as jasmine.SpyObj<AdminLoggerService>;

    // Setup default return values
    mockAdminApiService.getAdminStats.and.returnValue(of(mockAdminStats));
    mockAdminApiService.getAnalytics.and.returnValue(of(mockAnalyticsData));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load dashboard data on init', () => {
    component.ngOnInit();

    expect(mockAdminApiService.getAdminStats).toHaveBeenCalled();
    expect(mockAdminApiService.getAnalytics).toHaveBeenCalledWith('30d');
    expect(mockAdminLoggerService.logAdminAction).toHaveBeenCalledWith(
      'dashboard_viewed',
      { timestamp: jasmine.any(String) }
    );
  });

  it('should process stats data correctly', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.totalUsers).toBe(1250);
    expect(component.activeUsers).toBe(850);
    expect(component.totalPatches).toBe(3200);
    expect(component.averageRating).toBe(4.2);
    expect(component.systemUptime).toBe(604800);
    expect(component.loading).toBeFalse();
  }));

  it('should process analytics data correctly', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.userGrowthData.length).toBe(3);
    expect(component.patchActivityData.length).toBe(3);
    expect(component.categoryDistribution.length).toBe(3);
    expect(component.ratingDistribution.length).toBe(3);

    expect(component.userGrowthData[0].value).toBe(10);
    expect(component.patchActivityData[0].value).toBe(25);
    expect(component.categoryDistribution[0].category).toBe('bass');
  }));

  it('should create stats cards', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.statsCards.length).toBe(8);
    
    const totalUsersCard = component.statsCards.find(card => card.title === 'Total Users');
    expect(totalUsersCard).toBeTruthy();
    expect(totalUsersCard!.value).toBe(1250);
    expect(totalUsersCard!.icon).toBe('people');
    expect(totalUsersCard!.color).toBe('primary');
  }));

  it('should handle API errors gracefully', fakeAsync(() => {
    mockAdminApiService.getAdminStats.and.returnValue(throwError('API Error'));
    mockAdminApiService.getAnalytics.and.returnValue(throwError('API Error'));

    component.ngOnInit();
    tick();

    expect(component.error).toBe('Failed to load dashboard data');
    expect(component.loading).toBeFalse();
    expect(mockAdminLoggerService.logError).toHaveBeenCalled();
  }));

  it('should refresh data manually', () => {
    spyOn(component, 'loadDashboardData');
    
    component.onRefresh();

    expect(component.loadDashboardData).toHaveBeenCalled();
    expect(mockAdminLoggerService.logAdminAction).toHaveBeenCalledWith(
      'dashboard_manual_refresh',
      { timestamp: jasmine.any(String) }
    );
  });

  it('should toggle auto refresh', () => {
    component.autoRefreshEnabled = false;
    spyOn<any>(component, 'startAutoRefresh');
    spyOn<any>(component, 'stopAutoRefresh');

    component.onToggleAutoRefresh();

    expect(component.autoRefreshEnabled).toBeTrue();
    expect(component['startAutoRefresh']).toHaveBeenCalled();
    expect(mockAdminLoggerService.logAdminAction).toHaveBeenCalledWith(
      'dashboard_auto_refresh_toggle',
      { enabled: true, timestamp: jasmine.any(String) }
    );
  });

  it('should change refresh interval', () => {
    component.autoRefreshEnabled = true;
    spyOn<any>(component, 'startAutoRefresh');
    spyOn<any>(component, 'stopAutoRefresh');

    component.onRefreshIntervalChange(60);

    expect(component.refreshInterval).toBe(60);
    expect(component['stopAutoRefresh']).toHaveBeenCalled();
    expect(component['startAutoRefresh']).toHaveBeenCalled();
    expect(mockAdminLoggerService.logAdminAction).toHaveBeenCalledWith(
      'dashboard_refresh_interval_changed',
      { interval: 60, timestamp: jasmine.any(String) }
    );
  });

  it('should format uptime correctly', () => {
    const uptime = component['formatUptime'](604800); // 7 days
    expect(uptime).toBe('7d 0h');

    const uptime2 = component['formatUptime'](93784); // 1 day, 2 hours
    expect(uptime2).toBe('1d 2h');
  });

  it('should track stats cards by title', () => {
    const mockCard = { title: 'Test Card', value: 100, icon: 'test', color: 'primary' as any };
    const trackBy = component.trackByFn(0, mockCard);
    expect(trackBy).toBe('Test Card');
  });

  it('should cleanup subscriptions on destroy', () => {
    spyOn<any>(component, 'stopAutoRefresh');
    
    component.ngOnDestroy();

    expect(component['stopAutoRefresh']).toHaveBeenCalled();
  });

  it('should show loading state initially', () => {
    expect(component.loading).toBeTrue();
    
    const compiled = fixture.nativeElement;
    fixture.detectChanges();
    
    expect(compiled.querySelector('.loading-container')).toBeTruthy();
  });

  it('should show error state when API fails', fakeAsync(() => {
    mockAdminApiService.getAdminStats.and.returnValue(throwError('Network error'));
    
    component.ngOnInit();
    tick();
    fixture.detectChanges();

    expect(component.error).toBe('Failed to load dashboard data');
    
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.error-card')).toBeTruthy();
    expect(compiled.querySelector('.error-card').textContent).toContain('Failed to load dashboard data');
  }));

  it('should not start auto refresh when disabled', () => {
    component.autoRefreshEnabled = false;
    spyOn<any>(component, 'startAutoRefresh').and.callThrough();

    component.ngOnInit();

    // Auto refresh should not be started
    expect(component['refreshSubscription']).toBeUndefined();
  });
});