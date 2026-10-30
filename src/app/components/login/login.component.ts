import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  template: `<button (click)="login()">Login with Google</button>`,
  standalone: true,
  imports: []
})
export class LoginComponent {
  login(): void {
    window.location.href = '/auth/google';
  }
}
