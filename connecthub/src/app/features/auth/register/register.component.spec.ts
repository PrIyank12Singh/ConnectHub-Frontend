import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockAuthService: any;
  let mockThemeService: any;

  beforeEach(async () => {
    mockAuthService = { register: vi.fn() };
    mockThemeService = { toggle: vi.fn(), isDark$: new BehaviorSubject(false) };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ThemeService, useValue: mockThemeService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error when any field is empty', () => {
    component.fullName = '';
    component.username = 'user';
    component.email = 'e@e.com';
    component.password = 'pass1234';
    component.handleRegister();
    expect(component.error).toBe('Please fill in all fields');
  });

  it('should show error when password is less than 8 characters', () => {
    component.fullName = 'Full Name';
    component.username = 'user';
    component.email = 'e@e.com';
    component.password = 'short';
    component.handleRegister();
    expect(component.error).toBe('Password must be at least 8 characters');
  });

  it('should not call authService.register when validation fails', () => {
    component.fullName = '';
    component.handleRegister();
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it('should call authService.register with correct data', () => {
    mockAuthService.register.mockReturnValue(of({ message: 'Registered' }));
    component.fullName = 'Full Name';
    component.username = 'username';
    component.email = 'user@example.com';
    component.password = 'password123';
    component.handleRegister();

    expect(mockAuthService.register).toHaveBeenCalledWith({
      fullName: 'Full Name',
      username: 'username',
      email: 'user@example.com',
      password: 'password123'
    });
  });

  it('should show success message on successful registration', () => {
    mockAuthService.register.mockReturnValue(of({ message: 'Created' }));
    component.fullName = 'Full Name';
    component.username = 'username';
    component.email = 'user@example.com';
    component.password = 'password123';
    component.handleRegister();

    expect(component.success).toBe('Account created! Redirecting to login...');
    expect(component.loading).toBeFalsy();
  });

  it('should show error message on registration failure', () => {
    mockAuthService.register.mockReturnValue(
      throwError(() => ({ error: { message: 'Email already exists' } }))
    );
    component.fullName = 'Full Name';
    component.username = 'username';
    component.email = 'existing@example.com';
    component.password = 'password123';
    component.handleRegister();

    expect(component.error).toBe('Email already exists');
    expect(component.loading).toBeFalsy();
  });

  it('should clear previous error before submitting', () => {
    component.error = 'Previous error';
    mockAuthService.register.mockReturnValue(of({}));
    component.fullName = 'F';
    component.username = 'u';
    component.email = 'e@e.com';
    component.password = 'pass1234';
    component.handleRegister();
    expect(component.error).toBe('');
  });
});
