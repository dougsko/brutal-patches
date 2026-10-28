import { Component, OnDestroy, OnInit } from '@angular/core';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class RegisterComponent implements OnInit, OnDestroy {
  form: any = {
    username: null,
    email: null,
    password: null
  };
  isSuccessful = false;
  isSignUpFailed = false;
  errorMessage = '';
  registerSub!: Subscription;

  constructor(private userService: UserService) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    if (this.registerSub) {
      this.registerSub.unsubscribe();
    }
  }

  onSubmit(form?: any): void {
    if (form && !form.form.valid) {
      return;
    }

    const { username, email, password } = this.form;
    this.registerSub = this.userService.create(username, email, password).subscribe(
      data => {
        this.isSuccessful = true;
        this.isSignUpFailed = false;
      },
      err => {
        // Handle different error response formats
        this.errorMessage = err.error?.errors?.message || err.error?.message || 'Registration failed';
        this.isSignUpFailed = true;
      }
    );
  }
}

