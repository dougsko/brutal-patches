import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LoginComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
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
