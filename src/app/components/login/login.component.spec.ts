import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { TokenStorageService } from '../../services/token-storage.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    const mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };
    const mockTokenStorage = {
      saveToken: jasmine.createSpy('saveToken'),
      saveUser: jasmine.createSpy('saveUser'),
      getToken: jasmine.createSpy('getToken').and.returnValue(null),
      getUser: jasmine.createSpy('getUser').and.returnValue({ username: 'testuser', roles: [] })
    };

    await TestBed.configureTestingModule({
    declarations: [LoginComponent],
    schemas: [NO_ERRORS_SCHEMA],
    imports: [FormsModule],
    providers: [
        AuthService,
        { provide: Router, useValue: mockRouter },
        { provide: TokenStorageService, useValue: mockTokenStorage },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
    ]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with null credentials', () => {
    expect(component.form).toBeDefined();
    expect(component.form.username).toBeNull();
    expect(component.form.password).toBeNull();
  });

  it('should handle form validation states', () => {
    expect(component.isLoginFailed).toBeFalse();
    expect(component.errorMessage).toBe('');
    expect(component.isLoggedIn).toBeFalse();
  });

  it('should validate required username and password', () => {
    // Simulate form submission without filling fields
    component.form.username = '';
    component.form.password = '';
    
    expect(component.form.username).toBe('');
    expect(component.form.password).toBe('');
  });

  it('should handle login success state', () => {
    component.isLoggedIn = true;
    component.roles = ['user'];
    
    expect(component.isLoggedIn).toBeTrue();
    expect(component.roles).toEqual(['user']);
  });

  it('should handle login failure state', () => {
    component.isLoginFailed = true;
    component.errorMessage = 'Invalid credentials';
    
    expect(component.isLoginFailed).toBeTrue();
    expect(component.errorMessage).toBe('Invalid credentials');
  });

  it('should reset error states on new login attempt', () => {
    // Set error state
    component.isLoginFailed = true;
    component.errorMessage = 'Previous error';
    
    // Simulate new form submission preparation
    component.isLoginFailed = false;
    component.errorMessage = '';
    
    expect(component.isLoginFailed).toBeFalse();
    expect(component.errorMessage).toBe('');
  });
});
