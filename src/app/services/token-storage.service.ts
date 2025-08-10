import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'auth-token';
const USER_KEY = 'auth-user';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

interface JwtPayload {
  exp: number;
  iat: number;
  sub: string;
  username: string;
  email?: string;
  roles?: string[];
  isAdmin?: boolean;
  permissions?: string[];
}

interface TokenValidityStatus {
  isValid: boolean;
  isExpired: boolean;
  expiresIn: number; // milliseconds
  needsRefresh: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private tokenValiditySubject = new BehaviorSubject<TokenValidityStatus>({
    isValid: false,
    isExpired: true,
    expiresIn: 0,
    needsRefresh: false
  });

  public tokenValidity$ = this.tokenValiditySubject.asObservable();

  constructor() {
    // Check token validity on service initialization
    this.checkTokenValidity();
    
    // Set up periodic token validation (every minute)
    setInterval(() => {
      this.checkTokenValidity();
    }, 60000);
  }

  signOut(): void {
    window.sessionStorage.clear();
    this.updateTokenValidityStatus({
      isValid: false,
      isExpired: true,
      expiresIn: 0,
      needsRefresh: false
    });
  }

  public saveToken(token: string): void {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.setItem(TOKEN_KEY, token);
    this.checkTokenValidity();
  }

  public getToken(): string | null {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    // Validate token before returning
    const validity = this.validateToken(token);
    if (validity.isExpired) {
      console.warn('Token expired, clearing from storage');
      this.signOut();
      return null;
    }

    return token;
  }

  public saveUser(user: any): void {
    window.sessionStorage.removeItem(USER_KEY);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  public getUser(): any {
    const user = window.sessionStorage.getItem(USER_KEY);
    if (user) {
      return JSON.parse(user);
    }

    return {};
  }

  public isTokenValid(): boolean {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      return false;
    }

    const validity = this.validateToken(token);
    return validity.isValid && !validity.isExpired;
  }

  public getTokenExpirationTime(): Date | null {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      console.error('Error decoding token for expiration time:', error);
      return null;
    }
  }

  public getTimeUntilExpiry(): number {
    const expirationTime = this.getTokenExpirationTime();
    if (!expirationTime) {
      return 0;
    }

    return Math.max(0, expirationTime.getTime() - Date.now());
  }

  public needsRefresh(): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry();
    return timeUntilExpiry > 0 && timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD;
  }

  private validateToken(token: string): TokenValidityStatus {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Date.now() / 1000; // Convert to seconds
      const expiresIn = (decoded.exp - now) * 1000; // Convert back to milliseconds
      
      const isExpired = decoded.exp <= now;
      const isValid = !isExpired && !!decoded.sub && !!decoded.username;
      const needsRefresh = !isExpired && expiresIn <= TOKEN_REFRESH_THRESHOLD;

      return {
        isValid,
        isExpired,
        expiresIn: Math.max(0, expiresIn),
        needsRefresh
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        isValid: false,
        isExpired: true,
        expiresIn: 0,
        needsRefresh: false
      };
    }
  }

  private checkTokenValidity(): void {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      this.updateTokenValidityStatus({
        isValid: false,
        isExpired: true,
        expiresIn: 0,
        needsRefresh: false
      });
      return;
    }

    const validity = this.validateToken(token);
    this.updateTokenValidityStatus(validity);

    // Auto-logout if token is expired
    if (validity.isExpired) {
      console.warn('Token expired, signing out user');
      this.signOut();
    }
  }

  private updateTokenValidityStatus(status: TokenValidityStatus): void {
    this.tokenValiditySubject.next(status);
  }

  /**
   * Extract user roles and permissions from JWT token
   * Returns null if no token or if roles are not present in token
   */
  public getUserRoles(): { roles: string[], isAdmin: boolean, permissions: string[] } | null {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      
      // Check if roles information is present in token
      if (!decoded.roles && decoded.isAdmin === undefined) {
        return null; // No role information in token
      }

      const roles = decoded.roles || [];
      const isAdmin = decoded.isAdmin || roles.includes('admin') || decoded.username === 'admin';
      const permissions = decoded.permissions || (isAdmin ? ['admin.full'] : []);

      return {
        roles,
        isAdmin,
        permissions
      };
    } catch (error) {
      console.error('Error extracting user roles from token:', error);
      return null;
    }
  }

  /**
   * Check if current user has admin privileges based on token
   * Returns null if unable to determine from token
   */
  public isAdminFromToken(): boolean | null {
    const roles = this.getUserRoles();
    return roles ? roles.isAdmin : null;
  }

  /**
   * Check if user has specific role based on token
   */
  public hasRoleFromToken(role: string): boolean | null {
    const roles = this.getUserRoles();
    return roles ? roles.roles.includes(role) : null;
  }

  /**
   * Check if user has specific permission based on token
   */
  public hasPermissionFromToken(permission: string): boolean | null {
    const roles = this.getUserRoles();
    return roles ? (roles.permissions.includes(permission) || roles.isAdmin) : null;
  }

  // For debugging purposes
  public getTokenInfo(): any {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const userRoles = this.getUserRoles();
      
      return {
        username: decoded.username,
        subject: decoded.sub,
        email: decoded.email,
        roles: userRoles?.roles || [],
        isAdmin: userRoles?.isAdmin || false,
        permissions: userRoles?.permissions || [],
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
        expiresIn: this.getTimeUntilExpiry(),
        needsRefresh: this.needsRefresh()
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      return null;
    }
  }
}