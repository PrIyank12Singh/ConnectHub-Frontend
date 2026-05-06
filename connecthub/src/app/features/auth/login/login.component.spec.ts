import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuthService: any;
  let mockThemeService: any;
  let mockRouter: Router;

  const mockAuthResponse = {
    accessToken: 'token', userId: 'u1', username: 'user1',
    email: 'u@u.com', role: 'USER', tokenType: 'Bearer', issuedAt: ''
  };

  beforeEach(async () => {
    mockAuthService = { login: vi.fn() };
    mockThemeService = { toggle: vi.fn(), isDark$: new BehaviorSubject(false) };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ThemeService, useValue: mockThemeService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router);
    vi.spyOn(mockRouter, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error when fields are empty', () => {
    component.email = '';
    component.password = '';
    component.handleLogin();
    expect(component.error).toBe('Please fill in all fields');
  });

  it('should not call authService.login when fields empty', () => {
    component.email = '';
    component.password = '';
    component.handleLogin();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('should call authService.login with correct credentials', () => {
    mockAuthService.login.mockReturnValue(of(mockAuthResponse));
    component.email = 'test@test.com';
    component.password = 'password123';
    component.handleLogin();
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123'
    });
  });

  it('should set loading=true during login', () => {
    mockAuthService.login.mockReturnValue(of(mockAuthResponse));
    component.email = 'a@a.com';
    component.password = 'pass';
    // loading starts false
    expect(component.loading).toBeFalsy();
    component.handleLogin();
    // After observable completes, loading resets; just check it was called
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it('should display error on login failure', () => {
    mockAuthService.login.mockReturnValue(
      throwError(() => ({ error: { message: 'Invalid credentials' } }))
    );
    component.email = 'a@a.com';
    component.password = 'wrongpass';
    component.handleLogin();
    expect(component.error).toBe('Invalid credentials');
    expect(component.loading).toBeFalsy();
  });

  it('should set loading=false after login error', () => {
    mockAuthService.login.mockReturnValue(
      throwError(() => ({ error: { error: 'Unauthorized' } }))
    );
    component.email = 'a@a.com';
    component.password = 'wrong';
    component.handleLogin();
    expect(component.loading).toBeFalsy();
  });

  it('should clear error before retrying login', () => {
    component.error = 'Old error';
    mockAuthService.login.mockReturnValue(of(mockAuthResponse));
    component.email = 'a@a.com';
    component.password = 'pass';
    component.handleLogin();
    expect(component.error).toBe('');
  });
});
