import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';

const AUTH_API = `${environment.apiUrl}/api/auth/`;
const USERS_API = `${environment.apiUrl}/api/users/`;
const ADMIN_API = `${environment.apiUrl}/api/admin/`;

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

export interface UserRoles {
  roles: string[];
  isAdmin: boolean;
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService
  ) { }

  login(username: string, password: string): Observable<any> {
    return this.http.post(AUTH_API + 'login', {
      username,
      password
    }, httpOptions);
  }

  refreshToken(): Observable<any> {
    return this.http.post(AUTH_API + 'refresh', {}, httpOptions).pipe(
      tap((response: any) => {
        console.log('Token refreshed successfully');
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if current user has admin role
   * This method first checks the JWT token for roles, and if not found,
   * makes a backend call to verify admin status
   */
  isCurrentUserAdmin(): Observable<boolean> {
    const tokenInfo = this.tokenStorage.getTokenInfo();
    
    if (!tokenInfo || !this.tokenStorage.isTokenValid()) {
      return of(false);
    }

    // First try to get role from token
    const rolesFromToken = this.tokenStorage.getUserRoles();
    if (rolesFromToken && rolesFromToken.roles.length > 0) {
      return of(rolesFromToken.isAdmin);
    }

    // Fall back to checking with backend for simple admin flag
    // This is a backup method for cases where roles aren't in the JWT
    return this.checkAdminStatusWithBackend().pipe(
      map(response => response.isAdmin || false),
      catchError(() => of(false))
    );
  }

  /**
   * Get current user's roles and permissions
   */
  getCurrentUserRoles(): Observable<UserRoles | null> {
    const tokenInfo = this.tokenStorage.getTokenInfo();
    
    if (!tokenInfo || !this.tokenStorage.isTokenValid()) {
      return of(null);
    }

    // Try to get from token first
    const rolesFromToken = this.tokenStorage.getUserRoles();
    if (rolesFromToken) {
      return of(rolesFromToken);
    }

    // Fall back to backend call
    return this.checkAdminStatusWithBackend().pipe(
      map(response => ({
        roles: response.roles || [],
        isAdmin: response.isAdmin || false,
        permissions: response.permissions || []
      })),
      catchError(() => of({
        roles: [],
        isAdmin: false,
        permissions: []
      }))
    );
  }

  /**
   * Check admin status with backend
   * This is used as a fallback when role information is not available in JWT
   */
  private checkAdminStatusWithBackend(): Observable<any> {
    return this.http.get(`${AUTH_API}me/roles`, httpOptions).pipe(
      catchError(error => {
        // If the endpoint doesn't exist or fails, fall back to simple username check
        const tokenInfo = this.tokenStorage.getTokenInfo();
        const isSimpleAdmin = tokenInfo?.username === 'admin';
        
        console.warn('Admin status check failed, using fallback:', error);
        return of({
          isAdmin: isSimpleAdmin,
          roles: isSimpleAdmin ? ['admin'] : [],
          permissions: isSimpleAdmin ? ['admin.full'] : []
        });
      })
    );
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): Observable<boolean> {
    return this.getCurrentUserRoles().pipe(
      map(userRoles => {
        if (!userRoles) return false;
        return userRoles.permissions.includes(permission) || userRoles.isAdmin;
      })
    );
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): Observable<boolean> {
    return this.getCurrentUserRoles().pipe(
      map(userRoles => {
        if (!userRoles) return false;
        return userRoles.roles.includes(role);
      })
    );
  }

  /* register(username: string, email: string, password: string): Observable<any> {
    return this.http.post(USERS_API + 'create', {
      username,
      email,
      password
    }, httpOptions);
  } */
}