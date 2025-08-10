import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { TokenStorageService } from '../../services/token-storage.service';
import { AdminLoggerService } from '../services/admin-logger.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

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
    
    // First check if user is authenticated
    if (!this.tokenStorage.isTokenValid()) {
      this.logger.logSecurityEvent('admin_access_denied_no_token', {
        route: state.url,
        timestamp: new Date().toISOString()
      });
      this.router.navigate(['/login']);
      return false;
    }

    // Check admin role using enhanced auth service
    return this.authService.isCurrentUserAdmin().pipe(
      map(isAdmin => {
        if (isAdmin) {
          this.logger.logSecurityEvent('admin_access_granted', {
            route: state.url,
            user: this.tokenStorage.getTokenInfo()?.username,
            timestamp: new Date().toISOString()
          });
          return true;
        } else {
          this.logger.logSecurityEvent('admin_access_denied_insufficient_privileges', {
            route: state.url,
            user: this.tokenStorage.getTokenInfo()?.username,
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
}