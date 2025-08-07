import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  constructor(
    private snackBar: MatSnackBar,
    private zone: NgZone
  ) {}

  handleError(error: any): void {
    // Check if error is in Angular zone
    if (!this.zone) {
      console.error('Global Error (outside Angular zone):', error);
      return;
    }

    this.zone.run(() => {
      console.error('Global Error:', error);

      let message = 'An unexpected error occurred';
      let isUserFriendly = false;

      // Handle different types of errors
      if (error?.message) {
        if (this.isUserFriendlyError(error)) {
          message = error.message;
          isUserFriendly = true;
        } else if (error.message.includes('ChunkLoadError')) {
          message = 'Failed to load application resources. Please refresh the page.';
          isUserFriendly = true;
        } else if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
          message = 'Network connection error. Please check your internet connection.';
          isUserFriendly = true;
        } else if (error.message.includes('Script error')) {
          message = 'A script error occurred. Please refresh the page.';
          isUserFriendly = true;
        }
      }

      // Show user-friendly notification
      if (isUserFriendly) {
        this.showErrorSnackBar(message, 'error');
      } else {
        // For development, show more detailed error
        if (!this.isProduction()) {
          this.showErrorSnackBar(`${message}: ${error?.message || 'Unknown error'}`, 'error');
        } else {
          this.showErrorSnackBar(message, 'error');
        }
      }

      // In production, you might want to send this to a logging service
      if (this.isProduction()) {
        this.logErrorToService(error);
      }
    });
  }

  private isUserFriendlyError(error: any): boolean {
    const userFriendlyMessages = [
      'Invalid username or password',
      'User not found',
      'Token has expired',
      'Too many requests',
      'Validation error',
      'Authentication failed'
    ];

    return userFriendlyMessages.some(msg => 
      error.message?.toLowerCase().includes(msg.toLowerCase())
    );
  }

  private showErrorSnackBar(message: string, type: 'error' | 'warning' | 'info' = 'error'): void {
    const config = {
      duration: type === 'error' ? 8000 : 4000,
      horizontalPosition: 'end' as const,
      verticalPosition: 'top' as const,
      panelClass: [`snackbar-${type}`]
    };

    this.snackBar.open(message, 'Dismiss', config);
  }

  private logErrorToService(error: any): void {
    // TODO: Implement actual error reporting service
    console.log('Error logged to service:', {
      message: error?.message,
      stack: error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }

  private isProduction(): boolean {
    return window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('dev');
  }
}