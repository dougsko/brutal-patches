import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { TokenStorageService } from 'src/app/services/token-storage.service';
import { UiStateService } from 'src/app/services/ui-state.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  form: any = {
    username: null,
    password: null
  };
  isLoggedIn = false;
  isLoginFailed = false;
  errorMessage = '';
  roles: string[] = [];
  authSub!: Subscription;
  isLoading = false;

  constructor(
    private router: Router, 
    private authService: AuthService, 
    private tokenStorage: TokenStorageService,
    private uiState: UiStateService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    if (this.tokenStorage.getToken()) {
      this.isLoggedIn = true;
      this.roles = this.tokenStorage.getUser().roles;
    }

    // Subscribe to loading state
    this.uiState.isLoading('login').subscribe(loading => {
      this.isLoading = loading;
    });
  }

  ngOnDestroy(): void {
    if(this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  async onSubmit(form?: any): Promise<void> {
    if (form && !form.form.valid) {
      this.showValidationErrors();
      return;
    }

    if (!this.form.username || !this.form.password) {
      this.errorMessage = 'Username and password are required';
      this.isLoginFailed = true;
      return;
    }

    const { username, password } = this.form;

    try {
      await this.uiState.withLoadingState('login', async () => {
        const data = await this.authService.login(username, password).toPromise();
        
        this.tokenStorage.saveToken(data.access_token);
        this.tokenStorage.saveUser(data);

        this.isLoginFailed = false;
        this.isLoggedIn = true;
        this.roles = this.tokenStorage.getUser().roles;
        
        this.snackBar.open('Login successful!', 'Dismiss', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['snackbar-success']
        });

        // Small delay to show success message
        setTimeout(() => this.reloadPage(), 1000);
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Login failed';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.status === 401) {
        errorMessage = 'Invalid username or password';
      } else if (error?.status === 429) {
        errorMessage = 'Too many login attempts. Please wait before trying again.';
      } else if (error?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      this.errorMessage = errorMessage;
      this.isLoginFailed = true;
    }
  }

  private showValidationErrors(): void {
    const errors = [];
    
    if (!this.form.username) {
      errors.push('Username is required');
    }
    if (!this.form.password) {
      errors.push('Password is required');
    }
    
    this.errorMessage = errors.join(', ');
    this.isLoginFailed = true;
  }

  clearError(): void {
    this.isLoginFailed = false;
    this.errorMessage = '';
    this.uiState.clearError('login');
  }

  reloadPage(): void {
    this.router.navigate(["/"]).then( () => {
      window.location.reload();
    });
  }
}
