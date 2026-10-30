import { Component } from '@angular/core';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `<button (click)="login()">Login with Google</button>`,
})
export class LoginComponent {
  constructor(private authService: AuthService) {}
  login() { this.authService.login(); }
}
