import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../environments/environment';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockTokenStorage: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    const tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', 
      ['saveToken', 'getToken', 'saveUser', 'getUser', 'signOut', 'getTokenInfo', 'getUserRoles', 'isTokenValid']);

    TestBed.configureTestingModule({
    imports: [],
    providers: [
        AuthService,
        { provide: TokenStorageService, useValue: tokenStorageSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
    ]
});
    
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    mockTokenStorage = TestBed.inject(TokenStorageService) as jasmine.SpyObj<TokenStorageService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login user successfully', () => {
    const mockCredentials = { username: 'testuser', password: 'testpass' };
    const mockResponse = { 
      access_token: 'mock-jwt-token',
      username: 'testuser' 
    };

    service.login(mockCredentials.username, mockCredentials.password).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockCredentials);
    req.flush(mockResponse);
  });

  it('should handle login errors', () => {
    service.login('invalid', 'credentials').subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error.status).toBe(401);
      }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should make login API call with correct endpoint', () => {
    const mockResponse = { access_token: 'token', username: 'test' };

    service.login('test', 'pass').subscribe((response: any) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockResponse);
  });

  describe('Admin Role Checking', () => {
    it('should return true when user has admin role from token', (done) => {
      mockTokenStorage.getTokenInfo.and.returnValue({ username: 'admin' });
      mockTokenStorage.isTokenValid.and.returnValue(true);
      mockTokenStorage.getUserRoles.and.returnValue({
        roles: ['admin'],
        isAdmin: true,
        permissions: ['admin.full']
      });

      service.isCurrentUserAdmin().subscribe(isAdmin => {
        expect(isAdmin).toBe(true);
        done();
      });
    });

    it('should return false when user has no admin role in token', (done) => {
      mockTokenStorage.getTokenInfo.and.returnValue({ username: 'user' });
      mockTokenStorage.isTokenValid.and.returnValue(true);
      mockTokenStorage.getUserRoles.and.returnValue({
        roles: ['user'],
        isAdmin: false,
        permissions: []
      });

      service.isCurrentUserAdmin().subscribe(isAdmin => {
        expect(isAdmin).toBe(false);
        done();
      });
    });

    it('should fall back to backend check when no roles in token', (done) => {
      mockTokenStorage.getTokenInfo.and.returnValue({ username: 'admin' });
      mockTokenStorage.isTokenValid.and.returnValue(true);
      mockTokenStorage.getUserRoles.and.returnValue(null);

      service.isCurrentUserAdmin().subscribe(isAdmin => {
        expect(isAdmin).toBe(true); // fallback to username check
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/me/roles`);
      req.error(new ErrorEvent('Not found')); // Simulate endpoint not existing
    });

    it('should return false when token is invalid', (done) => {
      mockTokenStorage.getTokenInfo.and.returnValue(null);
      mockTokenStorage.isTokenValid.and.returnValue(false);

      service.isCurrentUserAdmin().subscribe(isAdmin => {
        expect(isAdmin).toBe(false);
        done();
      });
    });
  });

  describe('User Roles and Permissions', () => {
    it('should get current user roles', (done) => {
      const mockRoles = {
        roles: ['admin', 'user'],
        isAdmin: true,
        permissions: ['admin.full', 'user.create']
      };

      mockTokenStorage.getTokenInfo.and.returnValue({ username: 'admin' });
      mockTokenStorage.isTokenValid.and.returnValue(true);
      mockTokenStorage.getUserRoles.and.returnValue(mockRoles);

      service.getCurrentUserRoles().subscribe(roles => {
        expect(roles).toEqual(mockRoles);
        done();
      });
    });

    it('should check specific permissions', (done) => {
      mockTokenStorage.isTokenValid.and.returnValue(true);
      mockTokenStorage.getTokenInfo.and.returnValue({ username: 'admin' });
      mockTokenStorage.getUserRoles.and.returnValue({
        roles: ['admin'],
        isAdmin: true,
        permissions: ['admin.full', 'user.manage']
      });

      service.hasPermission('user.manage').subscribe(hasPermission => {
        expect(hasPermission).toBe(true);
        done();
      });
    });

    it('should return true for admin users even without specific permission', (done) => {
      mockTokenStorage.isTokenValid.and.returnValue(true);
      mockTokenStorage.getTokenInfo.and.returnValue({ username: 'admin' });
      mockTokenStorage.getUserRoles.and.returnValue({
        roles: ['admin'],
        isAdmin: true,
        permissions: []
      });

      service.hasPermission('any.permission').subscribe(hasPermission => {
        expect(hasPermission).toBe(true);
        done();
      });
    });

    it('should check specific roles', (done) => {
      mockTokenStorage.isTokenValid.and.returnValue(true);
      mockTokenStorage.getTokenInfo.and.returnValue({ username: 'moderator' });
      mockTokenStorage.getUserRoles.and.returnValue({
        roles: ['moderator', 'user'],
        isAdmin: false,
        permissions: ['content.moderate']
      });

      service.hasRole('moderator').subscribe(hasRole => {
        expect(hasRole).toBe(true);
        done();
      });
    });

    it('should return null for roles when user not authenticated', (done) => {
      mockTokenStorage.getTokenInfo.and.returnValue(null);
      mockTokenStorage.isTokenValid.and.returnValue(false);

      service.getCurrentUserRoles().subscribe(roles => {
        expect(roles).toBeNull();
        done();
      });
    });
  });

  describe('Refresh Token', () => {
    it('should refresh token successfully', () => {
      const mockResponse = { access_token: 'new-token' };

      service.refreshToken().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/refresh`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle refresh token errors', () => {
      service.refreshToken().subscribe({
        next: () => fail('Should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/refresh`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });
});
