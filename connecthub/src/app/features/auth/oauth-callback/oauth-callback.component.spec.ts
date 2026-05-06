import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { OAuthCallbackComponent } from './oauth-callback.component';
import { AuthService } from '../../../core/services/auth.service';
import { vi } from 'vitest';

describe('OAuthCallbackComponent', () => {
  let component: OAuthCallbackComponent;
  let fixture: ComponentFixture<OAuthCallbackComponent>;
  let mockAuthService: any;
  let mockRouter: any;

  const buildRoute = (params: Record<string, string>) => ({
    queryParams: of(params)
  });

  beforeEach(async () => {
    mockAuthService = { setCurrentUser: vi.fn(user => localStorage.setItem('connecthub_user', JSON.stringify(user))) };
    mockRouter = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [OAuthCallbackComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: buildRoute({
            token: 'jwt-abc',
            userId: 'uid-1',
            username: 'spriyank',
            email: 'test@gmail.com',
            role: 'USER'
          })
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    localStorage.clear();
    fixture = TestBed.createComponent(OAuthCallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should save token to localStorage on valid callback', () => {
    expect(localStorage.getItem('connecthub_token')).toBe('jwt-abc');
  });

  it('should save user object to localStorage', () => {
    const user = JSON.parse(localStorage.getItem('connecthub_user')!);
    expect(user.userId).toBe('uid-1');
    expect(user.username).toBe('spriyank');
    expect(user.email).toBe('test@gmail.com');
    expect(user.role).toBe('USER');
  });

  it('should call authService.setCurrentUser with user data', () => {
    expect(mockAuthService.setCurrentUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'uid-1', role: 'USER' })
    );
  });

  it('should navigate to /chat for regular USER role', () => {
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/chat']);
  });

  it('should navigate to /admin for PLATFORM_ADMIN role', async () => {
    TestBed.resetTestingModule();
    mockRouter = { navigate: vi.fn() };
    mockAuthService = { setCurrentUser: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [OAuthCallbackComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: buildRoute({
            token: 'admin-jwt',
            userId: 'admin-1',
            username: 'adminuser',
            email: 'admin@gmail.com',
            role: 'PLATFORM_ADMIN'
          })
        }
      ]
    }).compileComponents();

    const adminFixture = TestBed.createComponent(OAuthCallbackComponent);
    adminFixture.detectChanges();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should navigate to /login when no token in params', async () => {
    TestBed.resetTestingModule();
    mockRouter = { navigate: vi.fn() };
    mockAuthService = { setCurrentUser: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [OAuthCallbackComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: buildRoute({}) }
      ]
    }).compileComponents();

    const noTokenFixture = TestBed.createComponent(OAuthCallbackComponent);
    noTokenFixture.detectChanges();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
