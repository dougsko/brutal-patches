import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface ApiError {
  statusCode: number;
  message: string;
  details?: any;
  timestamp?: string;
  path?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HttpErrorInterceptorService implements HttpInterceptor {
  
  constructor(
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);

        let errorMessage = 'An error occurred';
        let shouldShowSnackBar = true;

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = error.error.message || 'Network error occurred';
          console.error('Client-side error:', error.error.message);
        } else {
          // Server-side error
          const apiError = error.error as ApiError;
          
          switch (error.status) {
            case 400:
              errorMessage = apiError?.message || 'Invalid request';
              break;
            case 401:
              errorMessage = apiError?.message || 'Authentication required';
              // Don't show snackbar for 401 on auth endpoints - handled by auth interceptor
              shouldShowSnackBar = !request.url.includes('/auth/');
              break;
            case 403:
              errorMessage = 'Access denied';
              break;
            case 404:
              errorMessage = apiError?.message || 'Resource not found';
              break;
            case 409:
              errorMessage = apiError?.message || 'Conflict occurred';
              break;
            case 422:
              errorMessage = this.formatValidationError(apiError);
              break;
            case 429:
              errorMessage = 'Too many requests. Please wait before trying again.';
              break;
            case 500:
              errorMessage = 'Server error. Please try again later.';
              break;
            case 503:
              errorMessage = 'Service temporarily unavailable. Please try again later.';
              break;
            default:
              errorMessage = apiError?.message || `HTTP Error ${error.status}`;
          }

          // Log detailed error info for debugging
          console.error('Server error details:', {
            status: error.status,
            message: errorMessage,
            url: request.url,
            method: request.method,
            apiError
          });
        }

        // Show user-friendly error notification
        if (shouldShowSnackBar) {
          this.showErrorNotification(errorMessage, error.status);
        }

        // Create structured error for components
        const structuredError = {
          status: error.status,
          message: errorMessage,
          originalError: error,
          apiError: error.error as ApiError
        };

        return throwError(() => structuredError);
      })
    );
  }

  private formatValidationError(apiError: ApiError): string {
    if (apiError?.details && Array.isArray(apiError.details)) {
      return `Validation error: ${apiError.details.join(', ')}`;
    }
    return apiError?.message || 'Validation error';
  }

  private showErrorNotification(message: string, status: number): void {
    const isWarning = status === 400 || status === 422;
    const duration = isWarning ? 6000 : 8000;
    
    this.snackBar.open(message, 'Dismiss', {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [isWarning ? 'snackbar-warning' : 'snackbar-error']
    });
  }
}

