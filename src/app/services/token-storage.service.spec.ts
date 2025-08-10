import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

// Mock JWT token for testing
const MOCK_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJ1c2VybmFtZSI6InRlc3RhZG1pbiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGVzIjpbImFkbWluIl0sImlzQWRtaW4iOnRydWUsInBlcm1pc3Npb25zIjpbImFkbWluLmZ1bGwiXSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.5YSJWVNhFx9_-5gV7g8e8rV6j7kRKH8pLFSJHG1LFTM';

const MOCK_JWT_TOKEN_NO_ROLES = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.yGJLhGRs4TnRnWjQyJzKxFzZJv8RzAw0e8HU2N8mKqQ';

const MOCK_EXPIRED_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid-signature';

xdescribe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
    
    // Clear session storage before each test
    window.sessionStorage.clear();
    
    // Mock console methods to avoid log pollution
    spyOn(console, 'error');
    spyOn(console, 'warn');
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Token Management', () => {
    it('should save and retrieve token', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      const token = service.getToken();
      expect(token).toBe(MOCK_JWT_TOKEN);
    });

    it('should return null when no token exists', () => {
      const token = service.getToken();
      expect(token).toBeNull();
    });

    it('should clear token when signing out', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      service.signOut();
      const token = service.getToken();
      expect(token).toBeNull();
    });

    it('should validate token correctly', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      expect(service.isTokenValid()).toBe(true);
    });

    it('should return false for invalid token', () => {
      expect(service.isTokenValid()).toBe(false);
    });
  });

  describe('User Data Management', () => {
    it('should save and retrieve user data', () => {
      const userData = { id: 1, username: 'testuser', email: 'test@example.com' };
      service.saveUser(userData);
      const retrievedUser = service.getUser();
      expect(retrievedUser).toEqual(userData);
    });

    it('should return empty object when no user data exists', () => {
      const user = service.getUser();
      expect(user).toEqual({});
    });
  });

  describe('Role Management', () => {
    it('should extract user roles from token with roles', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      const userRoles = service.getUserRoles();
      
      expect(userRoles).toBeTruthy();
      expect(userRoles!.roles).toEqual(['admin']);
      expect(userRoles!.isAdmin).toBe(true);
      expect(userRoles!.permissions).toEqual(['admin.full']);
    });

    it('should return null for token without roles', () => {
      service.saveToken(MOCK_JWT_TOKEN_NO_ROLES);
      const userRoles = service.getUserRoles();
      expect(userRoles).toBeNull();
    });

    it('should return null when no token exists', () => {
      const userRoles = service.getUserRoles();
      expect(userRoles).toBeNull();
    });

    it('should determine admin status from token', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      const isAdmin = service.isAdminFromToken();
      expect(isAdmin).toBe(true);
    });

    it('should check specific role from token', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      const hasAdminRole = service.hasRoleFromToken('admin');
      const hasUserRole = service.hasRoleFromToken('user');
      
      expect(hasAdminRole).toBe(true);
      expect(hasUserRole).toBe(false);
    });

    it('should check specific permission from token', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      const hasPermission = service.hasPermissionFromToken('admin.full');
      const hasOtherPermission = service.hasPermissionFromToken('user.create');
      
      expect(hasPermission).toBe(true);
      expect(hasOtherPermission).toBe(true); // Admin has all permissions
    });

    it('should return null for role checks when no token', () => {
      const isAdmin = service.isAdminFromToken();
      const hasRole = service.hasRoleFromToken('admin');
      const hasPermission = service.hasPermissionFromToken('admin.full');
      
      expect(isAdmin).toBeNull();
      expect(hasRole).toBeNull();
      expect(hasPermission).toBeNull();
    });

    it('should fall back to username check for admin status', () => {
      // Create a token with admin username but no explicit roles
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.yPxZk4JZsC4MYhQZH_7J6cKHxKaXUMMRX-HjNYMGQNk';
      
      service.saveToken(adminToken);
      const userRoles = service.getUserRoles();
      
      expect(userRoles!.isAdmin).toBe(true);
      expect(userRoles!.roles).toEqual([]);
      expect(userRoles!.permissions).toEqual(['admin.full']);
    });
  });

  describe('Token Info and Debugging', () => {
    it('should return detailed token info', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      const tokenInfo = service.getTokenInfo();
      
      expect(tokenInfo).toBeTruthy();
      expect(tokenInfo.username).toBe('testadmin');
      expect(tokenInfo.email).toBe('test@example.com');
      expect(tokenInfo.roles).toEqual(['admin']);
      expect(tokenInfo.isAdmin).toBe(true);
      expect(tokenInfo.permissions).toEqual(['admin.full']);
      expect(tokenInfo.expiresAt).toBeInstanceOf(Date);
      expect(tokenInfo.issuedAt).toBeInstanceOf(Date);
    });

    it('should return null for token info when no token', () => {
      const tokenInfo = service.getTokenInfo();
      expect(tokenInfo).toBeNull();
    });

    it('should handle malformed tokens gracefully', () => {
      service.saveToken('invalid.token.format');
      const tokenInfo = service.getTokenInfo();
      expect(tokenInfo).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Token Expiration', () => {
    it('should get token expiration time', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      const expirationTime = service.getTokenExpirationTime();
      expect(expirationTime).toBeInstanceOf(Date);
      expect(expirationTime!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for expiration when no token', () => {
      const expirationTime = service.getTokenExpirationTime();
      expect(expirationTime).toBeNull();
    });

    it('should calculate time until expiry', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      const timeUntilExpiry = service.getTimeUntilExpiry();
      expect(timeUntilExpiry).toBeGreaterThan(0);
    });

    it('should determine if token needs refresh', () => {
      service.saveToken(MOCK_JWT_TOKEN);
      const needsRefresh = service.needsRefresh();
      expect(needsRefresh).toBe(false); // Token expires far in future
    });
  });

  describe('Token Validity Observable', () => {
    it('should emit token validity status', (done) => {
      service.tokenValidity$.subscribe(status => {
        if (status.isValid) {
          expect(status.isExpired).toBe(false);
          expect(status.expiresIn).toBeGreaterThan(0);
          done();
        }
      });

      service.saveToken(MOCK_JWT_TOKEN);
    });

    it('should update validity when token is saved', (done) => {
      let emissionCount = 0;
      
      service.tokenValidity$.subscribe(status => {
        emissionCount++;
        if (emissionCount === 2) { // Second emission after saving token
          expect(status.isValid).toBe(true);
          expect(status.isExpired).toBe(false);
          done();
        }
      });

      setTimeout(() => {
        service.saveToken(MOCK_JWT_TOKEN);
      }, 10);
    });

    it('should update validity when user signs out', (done) => {
      service.saveToken(MOCK_JWT_TOKEN);
      
      let emissionCount = 0;
      service.tokenValidity$.subscribe(status => {
        emissionCount++;
        if (emissionCount === 3) { // Third emission after sign out
          expect(status.isValid).toBe(false);
          expect(status.isExpired).toBe(true);
          done();
        }
      });

      setTimeout(() => {
        service.signOut();
      }, 10);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JWT tokens gracefully', () => {
      service.saveToken('invalid-token');
      
      expect(service.isTokenValid()).toBe(false);
      expect(service.getUserRoles()).toBeNull();
      expect(service.getTokenInfo()).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle expired tokens', () => {
      // The MOCK_EXPIRED_TOKEN has an expiration in the past
      service.saveToken(MOCK_EXPIRED_TOKEN);
      
      // Should return null because token is expired
      expect(service.getToken()).toBeNull();
      expect(console.warn).toHaveBeenCalledWith('Token expired, clearing from storage');
    });
  });
});
