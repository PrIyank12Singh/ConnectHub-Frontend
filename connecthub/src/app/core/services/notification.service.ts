import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// ─── Models ──────────────────────────────────────────────────────────────────

export type NotificationType = 'NEW_MESSAGE' | 'MENTION' | 'ROOM_INVITE' | 'SYSTEM';

export interface NotificationResponse {
  notificationId: number;
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  roomId?: string;
  messageId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SendNotificationRequest {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  roomId?: string;
  messageId?: string;
}

export interface BulkNotificationRequest {
  recipientIds: string[];
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  roomId?: string;
  messageId?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class NotificationService {

  private readonly API = 'http://localhost:8080/notifications';

  /** Live unread badge count — subscribe in your navbar */
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ─── Send ──────────────────────────────────────────────────────────────────

  send(request: SendNotificationRequest): Observable<NotificationResponse> {
    return this.http.post<NotificationResponse>(this.API, request);
  }

  sendBulk(request: BulkNotificationRequest): Observable<NotificationResponse[]> {
    return this.http.post<NotificationResponse[]>(`${this.API}/bulk`, request);
  }

  sendEmail(toEmail: string, subject: string, body: string): Observable<any> {
    return this.http.post(`${this.API}/email`, { toEmail, subject, body });
  }

  sendPush(recipientId: string, title: string, body: string): Observable<any> {
    return this.http.post(`${this.API}/push/${recipientId}`, { title, body });
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  getByRecipient(recipientId: string): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(
      `${this.API}/recipient/${recipientId}`
    );
  }

  getUnreadCount(recipientId: string): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>(
      `${this.API}/recipient/${recipientId}/unread-count`
    ).pipe(
      tap(res => this.unreadCountSubject.next(res.unreadCount))
    );
  }

  getAll(): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(`${this.API}/all`);
  }

  // ─── Mark Read ─────────────────────────────────────────────────────────────

  markAsRead(notificationId: number): Observable<any> {
    return this.http.put(`${this.API}/${notificationId}/read`, {}).pipe(
      tap(() => {
        const current = this.unreadCountSubject.value;
        if (current > 0) this.unreadCountSubject.next(current - 1);
      })
    );
  }

  markAllRead(recipientId: string): Observable<any> {
    return this.http.put(
      `${this.API}/recipient/${recipientId}/read-all`, {}
    ).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete(`${this.API}/${notificationId}`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Refresh the unread badge — call on login and after STOMP events */
  refreshUnreadCount(recipientId: string): void {
    this.getUnreadCount(recipientId).subscribe();
  }

  /** Icon for each notification type */
  typeIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      NEW_MESSAGE: '💬',
      MENTION:     '@',
      ROOM_INVITE: '📩',
      SYSTEM:      '🔔',
    };
    return icons[type] ?? '🔔';
  }
}
