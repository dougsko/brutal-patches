import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { EventBusService } from '../services/event-bus.service';
import { EventData } from './event-data';
import { TokenStorageService } from '../services/token-storage.service';

const TOKEN_HEADER_KEY = 'Authorization';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(
    private router: Router,
    private tokenStorage: TokenStorageService,
    private authService: AuthService,
    private eventBusService: EventBusService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;
    const token = this.tokenStorage.getToken();
    
    if (token != null) {
      authReq = this.addTokenHeader(req, token);
    }

    return next.handle(authReq).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          if (error.status === 401 && !this.isRefreshRequest(req)) {
            // Don't auto-logout for My Patches endpoint - let component handle gracefully
            if (this.isMyPatchesRequest(req)) {
              return throwError(() => error);
            }
            return this.handle401Error(authReq, next);
          }
        }
        return throwError(() => error);
      })
    );
  }

  private addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({ 
      headers: request.headers.set(TOKEN_HEADER_KEY, 'Bearer ' + token) 
    });
  }

  private isRefreshRequest(request: HttpRequest<any>): boolean {
    return request.url.includes('/api/auth/refresh');
  }

  private isMyPatchesRequest(request: HttpRequest<any>): boolean {
    return request.url.includes('/api/patches/my');
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const token = this.tokenStorage.getToken();
      
      if (token) {
        return this.authService.refreshToken().pipe(
          switchMap((tokenResponse: any) => {
            this.isRefreshing = false;
            
            // Save new token and user data
            this.tokenStorage.saveToken(tokenResponse.access_token);
            this.tokenStorage.saveUser(tokenResponse);
            
            this.refreshTokenSubject.next(tokenResponse.access_token);
            
            // Retry the original request with new token
            return next.handle(this.addTokenHeader(request, tokenResponse.access_token));
          }),
          catchError((error) => {
            this.isRefreshing = false;
            
            // Refresh failed, logout user
            console.warn('Token refresh failed, logging out user');
            this.logout();
            
            return throwError(() => error);
          })
        );
      } else {
        // No token available, logout
        this.logout();
        return throwError(() => new Error('No token available'));
      }
    }

    // Token refresh is already in progress, wait for it
    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => next.handle(this.addTokenHeader(request, token)))
    );
  }

  private logout(): void {
    this.tokenStorage.signOut();
    this.eventBusService.emit(new EventData('logout', null));
    this.router.navigate(['/login']);
  }
}

export const authInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
];