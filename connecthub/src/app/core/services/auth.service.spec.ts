import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, User } from './auth.service';
import { StompService } from './stomp.service';
import { vi } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let mockStompService: any;

  const mockUser: User = {
    userId: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'USER',
    bio: 'Hello there'
  };

  const mockAuthResponse = {
    accessToken: 'mock-jwt-token',
    userId: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'USER',
    avatarUrl: '',
    tokenType: 'Bearer',
    issuedAt: new Date().toISOString()
  };

  beforeEach(() => {
    mockStompService = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    const mockRouter = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: StompService, useValue: mockStompService }
        ,{ provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  // ─── isLoggedIn ──────────────────────────────────────────────────────────

  it('should return false when no token in localStorage', () => {
    expect(service.isLoggedIn()).toBeFalsy();
  });

  it('should return true when token exists in localStorage', () => {
    localStorage.setItem('connecthub_token', 'some-token');
    expect(service.isLoggedIn()).toBeTruthy();
  });

  // ─── getToken ────────────────────────────────────────────────────────────

  it('should return null when no token stored', () => {
    expect(service.getToken()).toBeNull();
  });

  it('should return stored token', () => {
    localStorage.setItem('connecthub_token', 'abc123');
    expect(service.getToken()).toBe('abc123');
  });

  // ─── getCurrentUser ──────────────────────────────────────────────────────

  it('should return null when no user saved', () => {
    expect(service.getCurrentUser()).toBeNull();
  });

  it('should return user from localStorage on init', () => {
    localStorage.setItem('connecthub_user', JSON.stringify(mockUser));
    // Re-create service to pick up localStorage value
    const freshService = new AuthService(
      TestBed.inject(HttpClient),
      TestBed.inject(Router),
      mockStompService
    );
    expect(freshService.getCurrentUser()).toEqual(mockUser);
  });

  // ─── login ───────────────────────────────────────────────────────────────

  it('should store token and user after login', () => {
    service.login({ email: 'test@example.com', password: 'password' }).subscribe();

    const req = http.expectOne('http://localhost:8080/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockAuthResponse);

    expect(localStorage.getItem('connecthub_token')).toBe('mock-jwt-token');
    const savedUser = JSON.parse(localStorage.getItem('connecthub_user')!);
    expect(savedUser.userId).toBe('user-123');
    expect(savedUser.role).toBe('USER');
  });

  it('should update userSubject after login', () => {
    service.login({ email: 'test@example.com', password: 'password' }).subscribe();
    http.expectOne('http://localhost:8080/auth/login').flush(mockAuthResponse);

    expect(service.getCurrentUser()?.username).toBe('testuser');
  });

  it('should call stompService.connect after login', () => {
    service.login({ email: 'test@example.com', password: 'password' }).subscribe();
    http.expectOne('http://localhost:8080/auth/login').flush(mockAuthResponse);

    expect(mockStompService.connect).toHaveBeenCalledWith('mock-jwt-token', 'user-123');
  });

  // ─── logout ──────────────────────────────────────────────────────────────

  it('should clear localStorage and userSubject on logout', () => {
    localStorage.setItem('connecthub_token', 'token');
    localStorage.setItem('connecthub_user', JSON.stringify(mockUser));

    service.logout();

    expect(localStorage.getItem('connecthub_token')).toBeNull();
    expect(localStorage.getItem('connecthub_user')).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
  });

  // ─── updateCurrentUser ───────────────────────────────────────────────────

  it('should patch user fields and persist to localStorage', () => {
    localStorage.setItem('connecthub_user', JSON.stringify(mockUser));
    // Reinitialize to pick up saved user
    service['userSubject'].next(mockUser);

    service.updateCurrentUser({ username: 'newname', avatarUrl: 'http://img.png' });

    const updated = service.getCurrentUser();
    expect(updated?.username).toBe('newname');
    expect(updated?.avatarUrl).toBe('http://img.png');
    expect(updated?.email).toBe('test@example.com'); // unchanged field preserved
  });

  it('should do nothing if no current user when updating', () => {
    service['userSubject'].next(null);
    service.updateCurrentUser({ username: 'newname' });
    expect(service.getCurrentUser()).toBeNull();
  });

  // ─── register ────────────────────────────────────────────────────────────

  it('should POST to /auth/register with correct body', () => {
    const payload = { username: 'u', email: 'e@e.com', password: 'pass1234', fullName: 'Full Name' };
    service.register(payload).subscribe();

    const req = http.expectOne('http://localhost:8080/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ message: 'Registered' });
  });

  // ─── getProfile ──────────────────────────────────────────────────────────

  it('should GET user profile by userId', () => {
    service.getProfile('user-123').subscribe();
    const req = http.expectOne('http://localhost:8080/auth/profile/user-123');
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  it('should PUT user profile by userId', () => {
    const payload = { avatarUrl: 'http://img.png' };
    service.updateProfile('user-123', payload).subscribe();
    const req = http.expectOne('http://localhost:8080/auth/profile/user-123');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...mockUser, ...payload });
  });

  // ─── searchUsers ─────────────────────────────────────────────────────────

  it('should GET search users with username query param', () => {
    service.searchUsers('john').subscribe();
    const req = http.expectOne('http://localhost:8080/auth/search?username=john');
    expect(req.request.method).toBe('GET');
    req.flush([mockUser]);
  });

  // ─── user$ observable ────────────────────────────────────────────────────

  it('user$ should emit new value after login', () => {
    const values: (User | null)[] = [];
    const subscription = service.user$.subscribe(u => values.push(u));

    service.login({ email: 'test@example.com', password: 'pass' }).subscribe();
    http.expectOne('http://localhost:8080/auth/login').flush(mockAuthResponse);
    expect(values[values.length - 1]?.username).toBe('testuser');
    subscription.unsubscribe();
  });
});
