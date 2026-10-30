import { Component } from '@angular/core';

@Component({
  selector: 'app-session-timeout-warning',
  template: `<div *ngIf="showWarning" class="timeout-warning">Session expiring soon</div>`,
})
export class SessionTimeoutWarningComponent {
  showWarning = false;
}
