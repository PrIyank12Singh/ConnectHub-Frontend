import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { StompService } from './stomp.service';

export interface User {
  userId: string;
  username: string;
  email: string;
  role: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  avatarUrl?: string;
  tokenType: string;
  issuedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = 'http://localhost:8080';
  private tokenKey = 'connecthub_token';
  private userKey = 'connecthub_user';

  private userSubject = new BehaviorSubject<User | null>(this.getSavedUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router, private stompService: StompService) {}

  register(data: { username: string; email: string; password: string; fullName: string }): Observable<any> {
    return this.http.post(`${this.API}/auth/register`, data);
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/auth/login`, data).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.accessToken);
        const user: User = {
          userId: res.userId,
          username: res.username,
          email: res.email,
          role: res.role,
          avatarUrl: res.avatarUrl,
        };
        localStorage.setItem(this.userKey, JSON.stringify(user));
        this.userSubject.next(user);
        // Connect STOMP immediately after successful login
        try {
          this.stompService.connect(res.accessToken, res.userId);
        } catch (err) {
          console.warn('[AuthService] STOMP connect failed', err);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.userSubject.value;
  }

  updateCurrentUser(patch: Partial<User>): void {
    const current = this.userSubject.value;
    if (!current) return;

    const updated = { ...current, ...patch };
    this.userSubject.next(updated);
    localStorage.setItem(this.userKey, JSON.stringify(updated));
  }

  private getSavedUser(): User | null {
    const saved = localStorage.getItem(this.userKey);
    return saved ? JSON.parse(saved) : null;
  }

  getProfile(userId: string): Observable<any> {
    return this.http.get(`${this.API}/auth/profile/${userId}`);
  }

  searchUsers(username: string): Observable<any> {
    return this.http.get(`${this.API}/auth/search?username=${username}`);
  }

  updateStatus(userId: string, status: string): Observable<any> {
    return this.http.put(`${this.API}/auth/status/${userId}?status=${status}`, {});
  }
}
