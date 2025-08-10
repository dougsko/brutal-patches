import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { AdminGuard } from './admin.guard';
import { AuthService } from '../../services/auth.service';
import { TokenStorageService } from '../../services/token-storage.service';
import { AdminLoggerService } from '../services/admin-logger.service';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockTokenStorage: jasmine.SpyObj<TokenStorageService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockLogger: jasmine.SpyObj<AdminLoggerService>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isCurrentUserAdmin']);
    const tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', ['isTokenValid', 'getTokenInfo']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const loggerSpy = jasmine.createSpyObj('AdminLoggerService', ['logSecurityEvent']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: TokenStorageService, useValue: tokenStorageSpy },
        { provide: Router, useValue: routerSpy },
        { provide: AdminLoggerService, useValue: loggerSpy }
      ]
    });

    guard = TestBed.inject(AdminGuard);
    mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    mockTokenStorage = TestBed.inject(TokenStorageService) as jasmine.SpyObj<TokenStorageService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockLogger = TestBed.inject(AdminLoggerService) as jasmine.SpyObj<AdminLoggerService>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should deny access when no valid token exists', () => {
    mockTokenStorage.isTokenValid.and.returnValue(false);

    const result = guard.canActivate({} as any, { url: '/admin/dashboard' } as any);

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith('admin_access_denied_no_token', jasmine.any(Object));
  });

  it('should allow access when user has admin role', (done) => {
    mockTokenStorage.isTokenValid.and.returnValue(true);
    mockTokenStorage.getTokenInfo.and.returnValue({ username: 'testadmin' });
    mockAuthService.isCurrentUserAdmin.and.returnValue(of(true));

    const result = guard.canActivate({} as any, { url: '/admin/dashboard' } as any);

    if (typeof result === 'boolean') {
      fail('Expected Observable but got boolean');
    } else {
      (result as any).subscribe((hasAccess: boolean) => {
        expect(hasAccess).toBe(true);
        expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith('admin_access_granted', jasmine.any(Object));
        done();
      });
    }
  });

  it('should deny access when user does not have admin role', (done) => {
    mockTokenStorage.isTokenValid.and.returnValue(true);
    mockTokenStorage.getTokenInfo.and.returnValue({ username: 'testuser' });
    mockAuthService.isCurrentUserAdmin.and.returnValue(of(false));

    const result = guard.canActivate({} as any, { url: '/admin/dashboard' } as any);

    if (typeof result === 'boolean') {
      fail('Expected Observable but got boolean');
    } else {
      (result as any).subscribe((hasAccess: boolean) => {
        expect(hasAccess).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
        expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith('admin_access_denied_insufficient_privileges', jasmine.any(Object));
        done();
      });
    }
  });
});