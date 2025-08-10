import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { of, throwError } from 'rxjs';

import { SystemHealthComponent, HealthMetric } from './system-health.component';
import { AdminApiService, SystemHealth } from '../../services/admin-api.service';
import { AdminLoggerService } from '../../services/admin-logger.service';

describe('SystemHealthComponent', () => {
  let component: SystemHealthComponent;
  let fixture: ComponentFixture<SystemHealthComponent>;
  let mockAdminApiService: jasmine.SpyObj<AdminApiService>;
  let mockAdminLoggerService: jasmine.SpyObj<AdminLoggerService>;

  const mockSystemHealth: SystemHealth = {
    status: 'healthy',
    database: {
      status: 'connected',
      responseTime: 25
    },
    cache: {
      status: 'active',
      hitRate: 0.85
    },
    storage: {
      status: 'healthy',
      usage: 65.5
    },
    lastChecked: '2024-01-15T10:30:00Z'
  };

  beforeEach(async () => {
    const adminApiSpy = jasmine.createSpyObj('AdminApiService', [
      'getSystemHealth'
    ]);

    const loggerSpy = jasmine.createSpyObj('AdminLoggerService', [
      'logAdminAction',
      'logError'
    ]);

    await TestBed.configureTestingModule({
      declarations: [SystemHealthComponent],
      imports: [
        NoopAnimationsModule,
        FormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatChipsModule
      ],
      providers: [
        { provide: AdminApiService, useValue: adminApiSpy },
        { provide: AdminLoggerService, useValue: loggerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SystemHealthComponent);
    component = fixture.componentInstance;
    mockAdminApiService = TestBed.inject(AdminApiService) as jasmine.SpyObj<AdminApiService>;
    mockAdminLoggerService = TestBed.inject(AdminLoggerService) as jasmine.SpyObj<AdminLoggerService>;

    mockAdminApiService.getSystemHealth.and.returnValue(of(mockSystemHealth));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load health data on init', () => {
    component.ngOnInit();

    expect(mockAdminApiService.getSystemHealth).toHaveBeenCalled();
    expect(mockAdminLoggerService.logAdminAction).toHaveBeenCalledWith(
      'system_health_viewed',
      { timestamp: jasmine.any(String) }
    );
  });

  it('should process health data correctly', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.systemHealth).toEqual(mockSystemHealth);
    expect(component.overallStatus).toBe('healthy');
    expect(component.healthMetrics.length).toBe(6);
    expect(component.loading).toBeFalse();
  }));

  it('should process health metrics correctly', fakeAsync(() => {
    component.ngOnInit();
    tick();

    const databaseMetric = component.healthMetrics.find(m => m.name === 'Database');
    expect(databaseMetric).toBeTruthy();
    expect(databaseMetric!.status).toBe('healthy');
    expect(databaseMetric!.value).toBe('connected');
    expect(databaseMetric!.details).toBe('Response time: 25ms');
    expect(databaseMetric!.icon).toBe('storage');

    const cacheMetric = component.healthMetrics.find(m => m.name === 'Cache');
    expect(cacheMetric).toBeTruthy();
    expect(cacheMetric!.status).toBe('healthy');
    expect(cacheMetric!.details).toBe('Hit rate: 85.0%');

    const storageMetric = component.healthMetrics.find(m => m.name === 'Storage');
    expect(storageMetric).toBeTruthy();
    expect(storageMetric!.status).toBe('healthy');
    expect(storageMetric!.details).toBe('Usage: 65.5%');
  }));

  it('should handle warning storage status', fakeAsync(() => {
    const warningHealth = { ...mockSystemHealth };
    warningHealth.storage.usage = 85;
    mockAdminApiService.getSystemHealth.and.returnValue(of(warningHealth));

    component.ngOnInit();
    tick();

    const storageMetric = component.healthMetrics.find(m => m.name === 'Storage');
    expect(storageMetric!.status).toBe('warning');
    expect(storageMetric!.color).toBe('#ff9800');
  }));

  it('should handle critical storage status', fakeAsync(() => {
    const criticalHealth = { ...mockSystemHealth };
    criticalHealth.storage.usage = 95;
    mockAdminApiService.getSystemHealth.and.returnValue(of(criticalHealth));

    component.ngOnInit();
    tick();

    const storageMetric = component.healthMetrics.find(m => m.name === 'Storage');
    expect(storageMetric!.status).toBe('critical');
    expect(storageMetric!.color).toBe('#f44336');
  }));

  it('should handle API errors gracefully', fakeAsync(() => {
    mockAdminApiService.getSystemHealth.and.returnValue(throwError('API Error'));

    component.ngOnInit();
    tick();

    expect(component.error).toBe('Failed to load system health data');
    expect(component.loading).toBeFalse();
    expect(mockAdminLoggerService.logError).toHaveBeenCalled();
  }));

  it('should refresh health data manually', () => {
    spyOn(component, 'loadHealthData');
    
    component.onRefresh();

    expect(component.loadHealthData).toHaveBeenCalled();
    expect(mockAdminLoggerService.logAdminAction).toHaveBeenCalledWith(
      'system_health_manual_refresh',
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
      'system_health_auto_refresh_toggle',
      { enabled: true, timestamp: jasmine.any(String) }
    );
  });

  it('should get correct overall status icon', () => {
    expect(component.getOverallStatusIcon()).toBe('help'); // default

    component.overallStatus = 'healthy';
    expect(component.getOverallStatusIcon()).toBe('check_circle');

    component.overallStatus = 'warning';
    expect(component.getOverallStatusIcon()).toBe('warning');

    component.overallStatus = 'critical';
    expect(component.getOverallStatusIcon()).toBe('error');
  });

  it('should get correct overall status color', () => {
    expect(component.getOverallStatusColor()).toBe('#9e9e9e'); // default

    component.overallStatus = 'healthy';
    expect(component.getOverallStatusColor()).toBe('#4caf50');

    component.overallStatus = 'warning';
    expect(component.getOverallStatusColor()).toBe('#ff9800');

    component.overallStatus = 'critical';
    expect(component.getOverallStatusColor()).toBe('#f44336');
  });

  it('should get correct status badge class', () => {
    expect(component.getStatusBadgeClass('healthy')).toBe('status-healthy');
    expect(component.getStatusBadgeClass('warning')).toBe('status-warning');
    expect(component.getStatusBadgeClass('critical')).toBe('status-critical');
    expect(component.getStatusBadgeClass('unknown')).toBe('status-unknown');
  });

  it('should get correct storage status', () => {
    expect(component['getStorageStatus'](50)).toBe('healthy');
    expect(component['getStorageStatus'](85)).toBe('warning');
    expect(component['getStorageStatus'](95)).toBe('critical');
  });

  it('should get correct storage color', () => {
    expect(component['getStorageColor'](50)).toBe('#4caf50');
    expect(component['getStorageColor'](85)).toBe('#ff9800');
    expect(component['getStorageColor'](95)).toBe('#f44336');
  });

  it('should track health metrics by name', () => {
    const mockMetric: HealthMetric = {
      name: 'Test Metric',
      status: 'healthy',
      value: 'test',
      icon: 'test',
      color: '#4caf50'
    };
    const trackBy = component.trackByFn(0, mockMetric);
    expect(trackBy).toBe('Test Metric');
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
    mockAdminApiService.getSystemHealth.and.returnValue(throwError('Network error'));
    
    component.ngOnInit();
    tick();
    fixture.detectChanges();

    expect(component.error).toBe('Failed to load system health data');
    
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.error-card')).toBeTruthy();
    expect(compiled.querySelector('.error-card').textContent).toContain('Failed to load system health data');
  }));

  it('should handle disconnected database status', fakeAsync(() => {
    const unhealthyHealth = { ...mockSystemHealth };
    unhealthyHealth.database.status = 'disconnected';
    mockAdminApiService.getSystemHealth.and.returnValue(of(unhealthyHealth));

    component.ngOnInit();
    tick();

    const databaseMetric = component.healthMetrics.find(m => m.name === 'Database');
    expect(databaseMetric!.status).toBe('critical');
    expect(databaseMetric!.color).toBe('#f44336');
  }));

  it('should handle inactive cache status', fakeAsync(() => {
    const cacheIssueHealth = { ...mockSystemHealth };
    cacheIssueHealth.cache.status = 'inactive';
    mockAdminApiService.getSystemHealth.and.returnValue(of(cacheIssueHealth));

    component.ngOnInit();
    tick();

    const cacheMetric = component.healthMetrics.find(m => m.name === 'Cache');
    expect(cacheMetric!.status).toBe('warning');
    expect(cacheMetric!.color).toBe('#ff9800');
  }));
});