import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TokenStorageService } from '../../services/token-storage.service';

@Component({
  selector: 'app-session-timeout-warning',
  templateUrl: './session-timeout-warning.component.html',
  styleUrls: ['./session-timeout-warning.component.scss']
})
export class SessionTimeoutWarningComponent implements OnInit, OnDestroy {
  showWarning = false;
  timeUntilExpiry = 0;
  timeUntilExpiryFormatted = '';
  private tokenValiditySubscription?: Subscription;
  private countdownInterval?: any;

  constructor(
    private tokenStorage: TokenStorageService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to token validity changes
    this.tokenValiditySubscription = this.tokenStorage.tokenValidity$.subscribe(validity => {
      if (validity.isValid && validity.needsRefresh && !validity.isExpired) {
        this.showWarning = true;
        this.startCountdown(validity.expiresIn);
      } else if (validity.isExpired) {
        this.hideWarning();
      } else if (!validity.needsRefresh) {
        this.hideWarning();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.tokenValiditySubscription) {
      this.tokenValiditySubscription.unsubscribe();
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(expiresInMs: number): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.timeUntilExpiry = Math.floor(expiresInMs / 1000); // Convert to seconds

    this.countdownInterval = setInterval(() => {
      this.timeUntilExpiry--;
      this.timeUntilExpiryFormatted = this.formatTime(this.timeUntilExpiry);

      if (this.timeUntilExpiry <= 0) {
        this.hideWarning();
      }
    }, 1000);
  }

  private formatTime(seconds: number): string {
    if (seconds <= 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  extendSession(): void {
    this.authService.refreshToken().subscribe({
      next: (response) => {
        this.tokenStorage.saveToken(response.access_token);
        this.tokenStorage.saveUser(response);
        this.hideWarning();
      },
      error: (error) => {
        console.error('Failed to extend session:', error);
        this.logout();
      }
    });
  }

  logout(): void {
    this.tokenStorage.signOut();
    this.router.navigate(['/login']);
    this.hideWarning();
  }

  private hideWarning(): void {
    this.showWarning = false;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}