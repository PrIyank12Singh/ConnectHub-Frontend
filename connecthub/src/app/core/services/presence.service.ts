import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';

// ─── Models ──────────────────────────────────────────────────────────────────

export type UserStatus = 'ONLINE' | 'AWAY' | 'DND' | 'INVISIBLE';

export interface PresenceResponse {
  presenceId?: number;
  userId: string;
  status: UserStatus;
  customMessage?: string;
  deviceType?: string;
  connectedAt?: string;
  lastPingAt?: string;
  sessionId?: string;
}

export interface SetOnlineRequest {
  userId: string;
  sessionId: string;
  deviceType?: string;
  ipAddress?: string;
}

export interface UpdateStatusRequest {
  userId: string;
  status: UserStatus;
  customMessage?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PresenceService {

  private readonly API = 'http://localhost:8080/presence';

  /** Ping interval in ms — must be shorter than backend stale timeout (60 s) */
  private readonly PING_INTERVAL_MS = 25_000;

  private sessionId: string | null = null;
  private pingSubscription: Subscription | null = null;

  /** Local cache of the current user's own presence */
  private presenceSubject = new BehaviorSubject<PresenceResponse | null>(null);
  presence$ = this.presenceSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ─── Go Online ─────────────────────────────────────────────────────────────

  /**
   * Call this right after WebSocket connection is established.
   * Generates a browser-unique sessionId and starts the ping timer.
   */
  goOnline(userId: string): Observable<PresenceResponse> {
    this.sessionId = this.generateSessionId();

    const payload: SetOnlineRequest = {
      userId,
      sessionId: this.sessionId,
      deviceType: this.detectDeviceType(),
    };

    return this.http.post<PresenceResponse>(`${this.API}/online`, payload).pipe(
      tap(res => {
        this.presenceSubject.next(res);
        this.startPingTimer();
      })
    );
  }

  // ─── Go Offline ────────────────────────────────────────────────────────────

  /**
   * Call on logout or browser-close (use beforeunload event).
   */
  goOffline(userId: string): Observable<any> {
    this.stopPingTimer();
    return this.http.delete(`${this.API}/offline/${userId}`).pipe(
      tap(() => this.presenceSubject.next(null))
    );
  }

  /**
   * Disconnect only this session (useful on tab-close without logout).
   */
  disconnectSession(): Observable<any> {
    this.stopPingTimer();
    const sid = this.sessionId ?? 'unknown';
    return this.http.delete(`${this.API}/session/${sid}`).pipe(
      tap(() => this.presenceSubject.next(null))
    );
  }

  // ─── Update Status ──────────────────────────────────────────────────────────

  updateStatus(userId: string, status: UserStatus, customMessage?: string): Observable<PresenceResponse> {
    const payload: UpdateStatusRequest = { userId, status, customMessage };
    return this.http.put<PresenceResponse>(`${this.API}/status`, payload).pipe(
      tap(res => this.presenceSubject.next(res))
    );
  }

  // ─── Get Single Presence ────────────────────────────────────────────────────

  getPresence(userId: string): Observable<PresenceResponse> {
    return this.http.get<PresenceResponse>(`${this.API}/${userId}`);
  }

  // ─── Bulk Presence ──────────────────────────────────────────────────────────

  /**
   * Pass userIds of all room members to show online dots in the member list.
   */
  getBulkPresence(userIds: string[]): Observable<PresenceResponse[]> {
    return this.http.post<PresenceResponse[]>(`${this.API}/bulk`, { userIds });
  }

  // ─── Online Users List ──────────────────────────────────────────────────────

  getOnlineUsers(): Observable<PresenceResponse[]> {
    return this.http.get<PresenceResponse[]>(`${this.API}/users/online`);
  }

  // ─── Online Count ───────────────────────────────────────────────────────────

  getOnlineCount(): Observable<{ onlineCount: number }> {
    return this.http.get<{ onlineCount: number }>(`${this.API}/count/online`);
  }

  // ─── Is Online ──────────────────────────────────────────────────────────────

  isOnline(userId: string): Observable<{ online: boolean }> {
    return this.http.get<{ online: boolean }>(`${this.API}/check/${userId}`);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  getSessionId(): string | null {
    return this.sessionId;
  }

  /** Map a UserStatus to a CSS colour class */
  statusColor(status: UserStatus | undefined): string {
    const map: Record<UserStatus, string> = {
      ONLINE:    'bg-green-500',
      AWAY:      'bg-yellow-400',
      DND:       'bg-red-500',
      INVISIBLE: 'bg-gray-400',
    };
    return status ? (map[status] ?? 'bg-gray-400') : 'bg-gray-400';
  }

  /** Map UserStatus to display label */
  statusLabel(status: UserStatus | undefined): string {
    const map: Record<UserStatus, string> = {
      ONLINE:    'Online',
      AWAY:      'Away',
      DND:       'Do Not Disturb',
      INVISIBLE: 'Invisible',
    };
    return status ? (map[status] ?? 'Offline') : 'Offline';
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private startPingTimer(): void {
    this.stopPingTimer();
    this.pingSubscription = interval(this.PING_INTERVAL_MS).subscribe(() => {
      if (this.sessionId) {
        this.http.put(`${this.API}/ping/${this.sessionId}`, {}).subscribe({
          error: err => console.warn('[PresenceService] ping failed', err),
        });
      }
    });
  }

  private stopPingTimer(): void {
    this.pingSubscription?.unsubscribe();
    this.pingSubscription = null;
  }

  private generateSessionId(): string {
    return `web-${crypto.randomUUID()}`;
  }

  private detectDeviceType(): string {
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(ua)) return 'MOBILE';
    return 'WEB';
  }
}
