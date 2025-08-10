import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface MultiFactorConfirmationData {
  title: string;
  message: string;
  operation: string;
  riskLevel: 'high' | 'critical';
  requirePassword?: boolean;
  requireTwoFactor?: boolean;
  requireManagerApproval?: boolean;
  requiredConfirmationText?: string;
  additionalInfo?: string[];
}

@Component({
  selector: 'app-multi-factor-confirmation',
  template: `
    <div class="multi-factor-dialog">
      <h2 mat-dialog-title class="dialog-title" [ngClass]="getRiskLevelClass()">
        <mat-icon class="dialog-icon">{{ getRiskIcon() }}</mat-icon>
        {{ data.title }}
        <mat-chip class="risk-chip" [ngClass]="getRiskLevelClass()">
          {{ data.riskLevel.toUpperCase() }} RISK
        </mat-chip>
      </h2>
      
      <div mat-dialog-content class="dialog-content">
        <div class="warning-banner" [ngClass]="getRiskLevelClass()">
          <mat-icon>warning</mat-icon>
          <span>This is a {{ data.riskLevel }} risk operation that requires additional verification.</span>
        </div>

        <p class="message">{{ data.message }}</p>
        
        <div *ngIf="data.additionalInfo && data.additionalInfo.length" class="additional-info">
          <h4>Before proceeding, please note:</h4>
          <ul>
            <li *ngFor="let info of data.additionalInfo">{{ info }}</li>
          </ul>
        </div>

        <form [formGroup]="verificationForm" class="verification-form">
          
          <!-- Password Verification -->
          <mat-form-field *ngIf="data.requirePassword" appearance="outline" class="full-width">
            <mat-label>Confirm your password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput 
                   type="password" 
                   formControlName="password"
                   placeholder="Enter your admin password"
                   autocomplete="current-password">
            <mat-error *ngIf="verificationForm.get('password')?.hasError('required')">
              Password is required
            </mat-error>
          </mat-form-field>

          <!-- Two-Factor Authentication -->
          <mat-form-field *ngIf="data.requireTwoFactor" appearance="outline" class="full-width">
            <mat-label>Two-factor authentication code</mat-label>
            <mat-icon matPrefix>security</mat-icon>
            <input matInput 
                   formControlName="twoFactorCode"
                   placeholder="Enter 6-digit code"
                   maxlength="6"
                   autocomplete="one-time-code">
            <mat-error *ngIf="verificationForm.get('twoFactorCode')?.hasError('required')">
              Two-factor code is required
            </mat-error>
            <mat-error *ngIf="verificationForm.get('twoFactorCode')?.hasError('pattern')">
              Code must be 6 digits
            </mat-error>
          </mat-form-field>

          <!-- Manager Approval -->
          <div *ngIf="data.requireManagerApproval" class="manager-approval">
            <h4>Manager Approval Required</h4>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Manager's email</mat-label>
              <mat-icon matPrefix>supervisor_account</mat-icon>
              <input matInput 
                     formControlName="managerEmail"
                     placeholder="Enter approving manager's email"
                     type="email">
              <mat-error *ngIf="verificationForm.get('managerEmail')?.hasError('required')">
                Manager's email is required
              </mat-error>
              <mat-error *ngIf="verificationForm.get('managerEmail')?.hasError('email')">
                Enter a valid email address
              </mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Justification</mat-label>
              <textarea matInput 
                        formControlName="justification"
                        placeholder="Explain why this operation is necessary"
                        rows="3"></textarea>
              <mat-error *ngIf="verificationForm.get('justification')?.hasError('required')">
                Justification is required for manager approval
              </mat-error>
              <mat-error *ngIf="verificationForm.get('justification')?.hasError('minlength')">
                Justification must be at least 20 characters
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Confirmation Text -->
          <div *ngIf="data.requiredConfirmationText" class="confirmation-text">
            <p class="confirmation-prompt">
              Type <strong>{{ data.requiredConfirmationText }}</strong> to confirm this operation:
            </p>
            <mat-form-field appearance="outline" class="full-width">
              <input matInput 
                     formControlName="confirmationText"
                     [placeholder]="data.requiredConfirmationText"
                     autocomplete="off">
              <mat-error *ngIf="verificationForm.get('confirmationText')?.hasError('required')">
                Confirmation text is required
              </mat-error>
              <mat-error *ngIf="verificationForm.get('confirmationText')?.hasError('match')">
                Confirmation text does not match
              </mat-error>
            </mat-form-field>
          </div>

        </form>
      </div>
      
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button 
                (click)="onCancel()"
                class="cancel-button">
          Cancel Operation
        </button>
        <button mat-raised-button 
                [color]="getConfirmButtonColor()"
                (click)="onConfirm()"
                [disabled]="!isFormValid()"
                class="confirm-button">
          <mat-icon>{{ data.requireManagerApproval ? 'send' : 'verified_user' }}</mat-icon>
          {{ data.requireManagerApproval ? 'Request Approval' : 'Confirm & Execute' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .multi-factor-dialog {
      min-width: 500px;
      max-width: 700px;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 16px 0;
      position: relative;
      
      &.high {
        color: #ff9800;
      }
      
      &.critical {
        color: #f44336;
      }
    }

    .dialog-icon {
      font-size: 32px;
      height: 32px;
      width: 32px;
    }

    .risk-chip {
      position: absolute;
      top: -8px;
      right: -8px;
      font-size: 10px;
      font-weight: bold;
      
      &.high {
        background: #ff9800;
        color: white;
      }
      
      &.critical {
        background: #f44336;
        color: white;
      }
    }

    .dialog-content {
      padding: 0 0 16px 0;
      max-height: 70vh;
      overflow-y: auto;
    }

    .warning-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      
      &.high {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        color: #856404;
      }
      
      &.critical {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
      }
      
      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      
      span {
        font-weight: 500;
      }
    }

    .message {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 20px;
      color: rgba(0, 0, 0, 0.87);
    }

    .additional-info {
      background: #f5f5f5;
      border-left: 4px solid #2196f3;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;

      h4 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 14px;
        font-weight: 600;
      }

      ul {
        margin: 0;
        padding-left: 20px;
      }

      li {
        margin-bottom: 4px;
        color: rgba(0, 0, 0, 0.7);
        font-size: 14px;
      }
    }

    .verification-form {
      .full-width {
        width: 100%;
        margin-bottom: 16px;
      }

      .manager-approval {
        background: #e8f5e8;
        border: 1px solid #c8e6c9;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;

        h4 {
          margin: 0 0 12px 0;
          color: #2e7d32;
          font-size: 16px;
          font-weight: 600;
        }
      }

      .confirmation-text {
        margin-top: 20px;
        padding: 16px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 8px;

        .confirmation-prompt {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #856404;

          strong {
            color: #721c24;
            font-family: 'Courier New', monospace;
            background: #f8d7da;
            padding: 2px 6px;
            border-radius: 4px;
          }
        }
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 0 0 0;
      margin: 0;
    }

    .cancel-button {
      color: rgba(0, 0, 0, 0.54);
    }

    .confirm-button {
      min-width: 160px;
      
      mat-icon {
        margin-right: 8px;
      }
    }

    // Mobile responsive
    @media (max-width: 600px) {
      .multi-factor-dialog {
        min-width: 280px;
        max-width: 90vw;
      }

      .dialog-title {
        font-size: 18px;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;

        .risk-chip {
          position: static;
          margin-top: 4px;
        }
      }

      .dialog-actions {
        flex-direction: column-reverse;
        gap: 8px;

        button {
          width: 100%;
        }
      }
    }

    // Focus improvements
    .confirm-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    // High contrast mode
    @media (prefers-contrast: high) {
      .warning-banner {
        border-width: 2px;
      }
      
      .verification-form {
        .manager-approval,
        .confirmation-text {
          border-width: 2px;
        }
      }
    }
  `]
})
export class MultiFactorConfirmationComponent implements OnInit {
  verificationForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<MultiFactorConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MultiFactorConfirmationData,
    private formBuilder: FormBuilder
  ) {
    this.verificationForm = this.formBuilder.group({});
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    const formControls: any = {};

    if (this.data.requirePassword) {
      formControls.password = ['', Validators.required];
    }

    if (this.data.requireTwoFactor) {
      formControls.twoFactorCode = ['', [
        Validators.required,
        Validators.pattern(/^\d{6}$/)
      ]];
    }

    if (this.data.requireManagerApproval) {
      formControls.managerEmail = ['', [Validators.required, Validators.email]];
      formControls.justification = ['', [Validators.required, Validators.minLength(20)]];
    }

    if (this.data.requiredConfirmationText) {
      formControls.confirmationText = ['', [
        Validators.required,
        this.confirmationTextValidator.bind(this)
      ]];
    }

    this.verificationForm = this.formBuilder.group(formControls);
  }

  private confirmationTextValidator(control: any) {
    if (control.value !== this.data.requiredConfirmationText) {
      return { match: true };
    }
    return null;
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm(): void {
    if (this.isFormValid()) {
      const result = {
        confirmed: true,
        verificationData: {
          password: this.verificationForm.get('password')?.value,
          twoFactorCode: this.verificationForm.get('twoFactorCode')?.value,
          managerEmail: this.verificationForm.get('managerEmail')?.value,
          justification: this.verificationForm.get('justification')?.value,
          confirmationText: this.verificationForm.get('confirmationText')?.value,
          timestamp: new Date().toISOString()
        }
      };
      
      this.dialogRef.close(result);
    }
  }

  isFormValid(): boolean {
    return this.verificationForm.valid;
  }

  getRiskLevelClass(): string {
    return this.data.riskLevel;
  }

  getRiskIcon(): string {
    return this.data.riskLevel === 'critical' ? 'dangerous' : 'warning';
  }

  getConfirmButtonColor(): string {
    return this.data.riskLevel === 'critical' ? 'warn' : 'accent';
  }
}