import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';

import { AdminLayoutComponent } from './admin-layout.component';
import { AuthService } from '../../../services/auth.service';
import { TokenStorageService } from '../../../services/token-storage.service';
import { AdminLoggerService } from '../../services/admin-logger.service';

// Material modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let fixture: ComponentFixture<AdminLayoutComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockTokenStorage: jasmine.SpyObj<TokenStorageService>;
  let mockLogger: jasmine.SpyObj<AdminLoggerService>;
  let mockBreakpointObserver: jasmine.SpyObj<BreakpointObserver>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isCurrentUserAdmin']);
    const tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['getTokenInfo', 'signOut']);
    const loggerSpy = jasmine.createSpyObj('AdminLoggerService', ['logAdminAction']);
    const breakpointSpy = jasmine.createSpyObj('BreakpointObserver', ['observe']);

    await TestBed.configureTestingModule({
      declarations: [AdminLayoutComponent],
      imports: [
        RouterTestingModule,
        NoopAnimationsModule,
        MatToolbarModule,
        MatSidenavModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatMenuModule,
        MatChipsModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: TokenStorageService, useValue: tokenStorageSpy },
        { provide: AdminLoggerService, useValue: loggerSpy },
        { provide: BreakpointObserver, useValue: breakpointSpy }
      ]
    }).compileComponents();

    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockTokenStorage = TestBed.inject(TokenStorageService) as jasmine.SpyObj<TokenStorageService>;
    mockLogger = TestBed.inject(AdminLoggerService) as jasmine.SpyObj<AdminLoggerService>;
    mockBreakpointObserver = TestBed.inject(BreakpointObserver) as jasmine.SpyObj<BreakpointObserver>;

    // Setup default mock returns
    mockBreakpointObserver.observe.and.returnValue(of({ matches: false, breakpoints: {} }));
    mockTokenStorage.getTokenInfo.and.returnValue({
      username: 'testadmin',
      email: 'admin@test.com',
      roles: ['admin'],
      isAdmin: true
    });
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load admin user info on init', () => {
    expect(component.adminUser).toEqual(jasmine.objectContaining({
      username: 'testadmin',
      email: 'admin@test.com',
      roles: ['admin'],
      isAdmin: true
    }));
  });

  it('should log admin access on init', () => {
    expect(mockLogger.logAdminAction).toHaveBeenCalledWith('admin_panel_accessed', jasmine.any(Object));
  });

  it('should handle navigation item clicks', () => {
    const navItem = {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/admin/dashboard'
    };

    component.onNavItemClick(navItem);

    expect(mockLogger.logAdminAction).toHaveBeenCalledWith('admin_navigation', jasmine.objectContaining({
      route: '/admin/dashboard'
    }));
  });

  it('should handle logout', () => {
    component.onLogout();

    expect(mockLogger.logAdminAction).toHaveBeenCalledWith('admin_logout', jasmine.any(Object));
    expect(mockTokenStorage.signOut).toHaveBeenCalled();
  });

  it('should check permissions correctly', () => {
    expect(component.hasPermission()).toBe(true);
    expect(component.hasPermission('admin.users.manage')).toBe(true);
    
    component.adminUser.isAdmin = false;
    expect(component.hasPermission('admin.users.manage')).toBe(false);
  });

  it('should handle user menu clicks', () => {
    component.onUserMenuClick('profile');
    expect(mockLogger.logAdminAction).toHaveBeenCalledWith('admin_user_menu_click', jasmine.objectContaining({
      action: 'profile'
    }));

    component.onUserMenuClick('logout');
    expect(mockTokenStorage.signOut).toHaveBeenCalled();
  });
});