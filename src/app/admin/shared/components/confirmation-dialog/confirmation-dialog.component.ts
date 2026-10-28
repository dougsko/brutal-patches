import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  severity?: 'warning' | 'danger' | 'info';
  requireConfirmationText?: string; // If set, user must type this text to confirm
  additionalInfo?: string[];
}

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <div class="confirmation-dialog">
      <h2 mat-dialog-title class="dialog-title" [ngClass]="getSeverityClass()">
        <mat-icon class="dialog-icon">{{ getIcon() }}</mat-icon>
        {{ data.title }}
      </h2>
      
      <div mat-dialog-content class="dialog-content">
        <p class="message">{{ data.message }}</p>
        
        <div *ngIf="data.additionalInfo && data.additionalInfo.length" class="additional-info">
          <ul>
            <li *ngFor="let info of data.additionalInfo">{{ info }}</li>
          </ul>
        </div>
        
        <div *ngIf="data.requireConfirmationText" class="confirmation-input">
          <p class="confirmation-prompt">
            Type <strong>{{ data.requireConfirmationText }}</strong> to confirm:
          </p>
          <mat-form-field appearance="outline" class="full-width">
            <input 
              matInput 
              [(ngModel)]="confirmationText"
              [placeholder]="data.requireConfirmationText"
              aria-label="Confirmation text">
          </mat-form-field>
        </div>
      </div>
      
      <div mat-dialog-actions class="dialog-actions">
        <button 
          mat-button 
          (click)="onCancel()"
          class="cancel-button">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button 
          mat-raised-button 
          [color]="getButtonColor()"
          (click)="onConfirm()"
          [disabled]="!isConfirmEnabled()"
          class="confirm-button">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      min-width: 400px;
      max-width: 600px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 16px 0;
      
      &.warning {
        color: #ff9800;
      }
      
      &.danger {
        color: #f44336;
      }
      
      &.info {
        color: #2196f3;
      }
    }

    .dialog-icon {
      font-size: 28px;
      height: 28px;
      width: 28px;
    }

    .dialog-content {
      padding: 0 0 16px 0;
    }

    .message {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 16px;
      color: rgba(0, 0, 0, 0.87);
    }

    .additional-info {
      background: #f5f5f5;
      border-left: 4px solid #2196f3;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 4px;

      ul {
        margin: 0;
        padding-left: 20px;
      }

      li {
        margin-bottom: 4px;
        color: rgba(0, 0, 0, 0.7);
      }
    }

    .confirmation-input {
      margin-top: 16px;
      padding: 16px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
    }

    .confirmation-prompt {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #856404;

      strong {
        color: #721c24;
        font-family: 'Courier New', monospace;
        background: #f8d7da;
        padding: 2px 4px;
        border-radius: 2px;
      }
    }

    .full-width {
      width: 100%;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 0 0 0;
      margin: 0;
    }

    .cancel-button {
      color: rgba(0, 0, 0, 0.54);
    }

    .confirm-button {
      min-width: 100px;
    }

    /* Responsive design */
    @media (max-width: 600px) {
      .confirmation-dialog {
        min-width: 280px;
        max-width: 90vw;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        gap: 8px;

        button {
          width: 100%;
        }
      }
    }

    /* Accessibility improvements */
    .dialog-title:focus {
      outline: 2px solid #2196f3;
      outline-offset: 2px;
    }

    .confirm-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class ConfirmationDialogComponent {
  confirmationText = '';

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  isConfirmEnabled(): boolean {
    if (this.data.requireConfirmationText) {
      return this.confirmationText === this.data.requireConfirmationText;
    }
    return true;
  }

  getSeverityClass(): string {
    return this.data.severity || 'info';
  }

  getIcon(): string {
    switch (this.data.severity) {
      case 'danger':
        return 'dangerous';
      case 'warning':
        return 'warning';
      default:
        return 'help_outline';
    }
  }

  getButtonColor(): string {
    switch (this.data.severity) {
      case 'danger':
        return 'warn';
      case 'warning':
        return 'accent';
      default:
        return 'primary';
    }
  }
}