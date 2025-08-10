import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { TokenStorageService } from '../../services/token-storage.service';
import { AdminLoggerService } from '../services/admin-logger.service';
import { environment } from '../../../environments/environment';

interface AdminAccessAttempt {
  ip: string;
  username: string;
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private static readonly RATE_LIMIT_KEY = 'admin-access-attempts';
  private static readonly MAX_ATTEMPTS = environment.security?.adminAccessRateLimit?.maxAttempts || 5;
  private static readonly WINDOW_MS = environment.security?.adminAccessRateLimit?.windowMs || 15 * 60 * 1000;

  constructor(
    private authService: AuthService,
    private tokenStorage: TokenStorageService,
    private router: Router,
    private logger: AdminLoggerService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    const username = this.tokenStorage.getTokenInfo()?.username || 'unknown';
    const clientIP = this.getClientIP(); // Fallback since we can't get real IP client-side
    
    // Check rate limiting first
    if (this.isRateLimited(clientIP, username)) {
      this.logger.logSecurityEvent('admin_access_denied_rate_limited', {
        route: state.url,
        user: username,
        clientIP,
        timestamp: new Date().toISOString()
      });
      this.router.navigate(['/']);
      return of(false);
    }
    
    // Check if user is authenticated
    if (!this.tokenStorage.isTokenValid()) {
      this.recordFailedAttempt(clientIP, username);
      this.logger.logSecurityEvent('admin_access_denied_no_token', {
        route: state.url,
        user: username,
        timestamp: new Date().toISOString()
      });
      this.router.navigate(['/login']);
      return false;
    }

    // Check admin role using enhanced auth service
    return this.authService.isCurrentUserAdmin().pipe(
      map(isAdmin => {
        if (isAdmin) {
          this.clearFailedAttempts(clientIP, username);
          this.logger.logSecurityEvent('admin_access_granted', {
            route: state.url,
            user: username,
            timestamp: new Date().toISOString()
          });
          return true;
        } else {
          this.recordFailedAttempt(clientIP, username);
          this.logger.logSecurityEvent('admin_access_denied_insufficient_privileges', {
            route: state.url,
            user: username,
            timestamp: new Date().toISOString()
          });
          this.router.navigate(['/']);
          return false;
        }
      }),
      tap(hasAccess => {
        if (!hasAccess) {
          console.warn('Admin access denied: insufficient privileges');
        }
      })
    );
  }

  private getClientIP(): string {
    // Since we can't get real client IP from browser, use a consistent identifier
    // In production, this would be handled server-side
    return 'client-browser-session';
  }

  private isRateLimited(ip: string, username: string): boolean {
    const key = this.getRateLimitKey(ip, username);
    const storedData = localStorage.getItem(key);
    
    if (!storedData) {
      return false;
    }

    try {
      const attemptData: AdminAccessAttempt = JSON.parse(storedData);
      const now = Date.now();

      // Check if still within block period
      if (attemptData.blockedUntil && now < attemptData.blockedUntil) {
        return true;
      }

      // Check if within rate limit window
      if (now - attemptData.lastAttempt > AdminGuard.WINDOW_MS) {
        // Window expired, clear the record
        localStorage.removeItem(key);
        return false;
      }

      // Within window, check attempt count
      return attemptData.attempts >= AdminGuard.MAX_ATTEMPTS;
    } catch (error) {
      console.error('Error parsing rate limit data:', error);
      localStorage.removeItem(key);
      return false;
    }
  }

  private recordFailedAttempt(ip: string, username: string): void {
    const key = this.getRateLimitKey(ip, username);
    const storedData = localStorage.getItem(key);
    const now = Date.now();

    let attemptData: AdminAccessAttempt;

    if (storedData) {
      try {
        attemptData = JSON.parse(storedData);
        
        // If outside window, reset
        if (now - attemptData.lastAttempt > AdminGuard.WINDOW_MS) {
          attemptData.attempts = 1;
          attemptData.lastAttempt = now;
          delete attemptData.blockedUntil;
        } else {
          attemptData.attempts++;
          attemptData.lastAttempt = now;
          
          // Block if exceeded max attempts
          if (attemptData.attempts >= AdminGuard.MAX_ATTEMPTS) {
            attemptData.blockedUntil = now + AdminGuard.WINDOW_MS;
          }
        }
      } catch (error) {
        console.error('Error parsing stored attempt data:', error);
        attemptData = {
          ip,
          username,
          attempts: 1,
          lastAttempt: now
        };
      }
    } else {
      attemptData = {
        ip,
        username,
        attempts: 1,
        lastAttempt: now
      };
    }

    localStorage.setItem(key, JSON.stringify(attemptData));

    this.logger.logSecurityEvent('admin_access_attempt_recorded', {
      ip,
      username,
      attempts: attemptData.attempts,
      blocked: !!attemptData.blockedUntil,
      timestamp: new Date().toISOString()
    });
  }

  private clearFailedAttempts(ip: string, username: string): void {
    const key = this.getRateLimitKey(ip, username);
    localStorage.removeItem(key);
  }

  private getRateLimitKey(ip: string, username: string): string {
    return `${AdminGuard.RATE_LIMIT_KEY}-${ip}-${username}`;
  }
}