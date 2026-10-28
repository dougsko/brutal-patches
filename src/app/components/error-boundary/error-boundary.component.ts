import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-error-boundary',
  template: `
    <div class="error-boundary" *ngIf="hasError">
      <div class="error-container">
        <div class="error-icon">
          <mat-icon>error_outline</mat-icon>
        </div>
        <div class="error-content">
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
          <div class="error-actions" *ngIf="showActions">
            <button mat-button color="primary" (click)="retry()" *ngIf="showRetry">
              <mat-icon>refresh</mat-icon>
              Try Again
            </button>
            <button mat-button (click)="goHome()" *ngIf="showHome">
              <mat-icon>home</mat-icon>
              Go to Home
            </button>
            <button mat-button (click)="reportError()" *ngIf="showReport">
              <mat-icon>report</mat-icon>
              Report Issue
            </button>
          </div>
          <details *ngIf="showDetails && errorDetails" class="error-details">
            <summary>Technical Details</summary>
            <pre>{{ errorDetails }}</pre>
          </details>
        </div>
      </div>
    </div>
    <ng-content *ngIf="!hasError"></ng-content>
  `,
  styles: [`
    .error-boundary {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      padding: 2rem;
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 600px;
      background: var(--mat-card-background-color);
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .error-icon {
      margin-bottom: 1rem;
    }

    .error-icon mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      color: var(--mat-warn-color);
    }

    .error-content h3 {
      margin: 0 0 1rem 0;
      color: var(--mat-warn-color);
      font-size: 1.5rem;
    }

    .error-content p {
      margin: 0 0 2rem 0;
      color: var(--mat-text-secondary-color);
      line-height: 1.5;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .error-details {
      margin-top: 2rem;
      text-align: left;
      width: 100%;
    }

    .error-details summary {
      cursor: pointer;
      color: var(--mat-text-secondary-color);
      margin-bottom: 0.5rem;
    }

    .error-details pre {
      background: var(--mat-card-background-color);
      border: 1px solid var(--mat-divider-color);
      border-radius: 4px;
      padding: 1rem;
      overflow-x: auto;
      font-size: 0.875rem;
      color: var(--mat-text-primary-color);
    }

    @media (max-width: 600px) {
      .error-boundary {
        padding: 1rem;
      }
      
      .error-container {
        padding: 1.5rem;
      }
      
      .error-actions {
        flex-direction: column;
        width: 100%;
      }
      
      .error-actions button {
        width: 100%;
      }
    }
  `]
})
export class ErrorBoundaryComponent implements OnInit {
  @Input() hasError: boolean = false;
  @Input() title: string = 'Something went wrong';
  @Input() message: string = 'An unexpected error occurred. Please try again.';
  @Input() errorDetails: string = '';
  @Input() showRetry: boolean = true;
  @Input() showHome: boolean = true;
  @Input() showReport: boolean = false;
  @Input() showActions: boolean = true;
  @Input() showDetails: boolean = false;

  ngOnInit(): void {
    // Show technical details in development environment
    this.showDetails = this.showDetails || !this.isProduction();
  }

  retry(): void {
    window.location.reload();
  }

  goHome(): void {
    window.location.href = '/';
  }

  reportError(): void {
    // TODO: Implement error reporting
    console.log('Error reported:', this.errorDetails);
  }

  private isProduction(): boolean {
    return window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('dev');
  }
}