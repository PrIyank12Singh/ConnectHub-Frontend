import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { adminGuard } from './admin.guard';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { vi } from 'vitest';

describe('adminGuard', () => {
  let mockAuthService: any;
  let mockRouter: any;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    mockAuthService = {
      getCurrentUser: vi.fn(),
      isLoggedIn: vi.fn(),
    };
    mockRouter = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    injector = TestBed.inject(EnvironmentInjector);
  });

  it('should return true for PLATFORM_ADMIN user', () => {
    mockAuthService.getCurrentUser.mockReturnValue({
      userId: '1', username: 'admin', email: 'a@a.com', role: 'PLATFORM_ADMIN'
    });

    const result = runInInjectionContext(injector, () => adminGuard({} as any, {} as any));
    expect(result).toBeTruthy();
  });

  it('should redirect to /chat for authenticated non-admin user', () => {
    mockAuthService.getCurrentUser.mockReturnValue({
      userId: '1', username: 'user', email: 'u@u.com', role: 'USER'
    });

    const result = runInInjectionContext(injector, () => adminGuard({} as any, {} as any));
    expect(result).toBeFalsy();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/chat']);
  });

  it('should redirect to /login when no user', () => {
    mockAuthService.getCurrentUser.mockReturnValue(null);

    const result = runInInjectionContext(injector, () => adminGuard({} as any, {} as any));
    expect(result).toBeFalsy();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});

describe('authGuard', () => {
  let mockAuthService: any;
  let mockRouter: any;
  let injector: EnvironmentInjector;

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: vi.fn(),
    };
    mockRouter = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    injector = TestBed.inject(EnvironmentInjector);
  });

  it('should return true when user is logged in', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    const result = runInInjectionContext(injector, () => authGuard({} as any, {} as any));
    expect(result).toBeTruthy();
  });

  it('should redirect to /login when not logged in', () => {
    mockAuthService.isLoggedIn.mockReturnValue(false);
    const result = runInInjectionContext(injector, () => authGuard({} as any, {} as any));
    expect(result).toBeFalsy();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
