import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * WebService — Angular service that talks exclusively to the
 * connecthub-web MVC layer (port 8088 via api-gateway at 8080/web/**).
 *
 * Use this service for all aggregated / MVC-layer calls.
 * Direct per-microservice calls (auth.service.ts, room.service.ts etc.)
 * still work via the gateway — both patterns co-exist.
 */
@Injectable({ providedIn: 'root' })
export class WebService {
  // All requests go through api-gateway on :8080, which forwards /web/** to connecthub-web
  private readonly BASE = 'http://localhost:8080/web';

  constructor(private http: HttpClient) {}

  // ─── Auth ─────────────────────────────────────────────────────────────────

  register(data: { username: string; email: string; password: string; fullName: string }): Observable<any> {
    return this.http.post(`${this.BASE}/auth/register`, data);
  }

  login(data: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.BASE}/auth/login`, data);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.BASE}/auth/logout`, {});
  }

  refresh(): Observable<any> {
    return this.http.post(`${this.BASE}/auth/refresh`, {});
  }

  getProfile(userId: string): Observable<any> {
    return this.http.get(`${this.BASE}/auth/profile/${userId}`);
  }

  updateProfile(userId: string, data: any): Observable<any> {
    return this.http.put(`${this.BASE}/auth/profile/${userId}`, data);
  }

  changePassword(userId: string, data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http.put(`${this.BASE}/auth/password/${userId}`, data);
  }

  searchUsers(username: string): Observable<any> {
    return this.http.get(`${this.BASE}/auth/search?username=${username}`);
  }

  updateStatus(userId: string, status: string): Observable<any> {
    return this.http.put(`${this.BASE}/auth/status/${userId}?status=${status}`, {});
  }

  // ─── Dashboard (aggregated) ───────────────────────────────────────────────

  /**
   * Single call that returns: profile + rooms + presence + unread notif count.
   * Use this on app startup to populate the UI in one round-trip.
   */
  getDashboard(userId: string): Observable<{
    profile: any;
    rooms: any[];
    presence: any;
    unreadNotifCount: number;
  }> {
    return this.http.get<any>(`${this.BASE}/dashboard/${userId}`);
  }

  // ─── Rooms ────────────────────────────────────────────────────────────────

  createRoom(data: { name: string; type: string; createdById: string; description?: string }): Observable<any> {
    return this.http.post(`${this.BASE}/rooms`, data);
  }

  getRoomsByUser(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/rooms/user/${userId}`);
  }

  getRoomById(roomId: string): Observable<any> {
    return this.http.get(`${this.BASE}/rooms/${roomId}`);
  }

  updateRoom(roomId: string, data: any): Observable<any> {
    return this.http.put(`${this.BASE}/rooms/${roomId}`, data);
  }

  deleteRoom(roomId: string): Observable<any> {
    return this.http.delete(`${this.BASE}/rooms/${roomId}`);
  }

  getRoomMembers(roomId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/rooms/${roomId}/members`);
  }

  addMember(roomId: string, data: { userId: string; role?: string }): Observable<any> {
    return this.http.post(`${this.BASE}/rooms/${roomId}/members`, data);
  }

  removeMember(roomId: string, userId: string): Observable<any> {
    return this.http.delete(`${this.BASE}/rooms/${roomId}/members/${userId}`);
  }

  updateMemberRole(roomId: string, userId: string, role: string): Observable<any> {
    return this.http.put(`${this.BASE}/rooms/${roomId}/members/${userId}/role?role=${role}`, {});
  }

  muteMember(roomId: string, userId: string, mute: boolean): Observable<any> {
    return this.http.put(`${this.BASE}/rooms/${roomId}/members/${userId}/mute?mute=${mute}`, {});
  }

  updateLastRead(roomId: string, userId: string): Observable<any> {
    return this.http.put(`${this.BASE}/rooms/${roomId}/members/${userId}/read`, {});
  }

  getUnreadCount(roomId: string, userId: string): Observable<number> {
    return this.http.get<number>(`${this.BASE}/rooms/${roomId}/unread/${userId}`);
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  sendMessage(data: { roomId: string; senderId: string; content: string; type?: string; mediaUrl?: string; replyToMessageId?: string }): Observable<any> {
    return this.http.post(`${this.BASE}/messages`, data);
  }

  getMessagesByRoom(roomId: string, page = 0, size = 20): Observable<any> {
    return this.http.get(`${this.BASE}/messages/room/${roomId}?page=${page}&size=${size}`);
  }

  getMessageById(messageId: string): Observable<any> {
    return this.http.get(`${this.BASE}/messages/${messageId}`);
  }

  editMessage(messageId: string, content: string): Observable<any> {
    return this.http.put(`${this.BASE}/messages/${messageId}`, { content });
  }

  deleteMessage(messageId: string): Observable<any> {
    return this.http.delete(`${this.BASE}/messages/${messageId}`);
  }

  searchMessages(roomId: string, keyword: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/messages/room/${roomId}/search?keyword=${keyword}`);
  }

  updateDeliveryStatus(messageId: string, status: 'SENT' | 'DELIVERED' | 'READ'): Observable<any> {
    return this.http.put(`${this.BASE}/messages/${messageId}/status?status=${status}`, {});
  }

  // ─── Presence ─────────────────────────────────────────────────────────────

  setOnline(userId: string, deviceType = 'WEB'): Observable<any> {
    return this.http.post(`${this.BASE}/presence/online/${userId}`, { deviceType });
  }

  setOffline(userId: string): Observable<any> {
    return this.http.post(`${this.BASE}/presence/offline/${userId}`, {});
  }

  getPresence(userId: string): Observable<any> {
    return this.http.get(`${this.BASE}/presence/${userId}`);
  }

  updatePresenceStatus(userId: string, status: 'ONLINE' | 'AWAY' | 'DND' | 'INVISIBLE'): Observable<any> {
    return this.http.put(`${this.BASE}/presence/status/${userId}?status=${status}`, {});
  }

  getOnlineCount(): Observable<number> {
    return this.http.get<number>(`${this.BASE}/presence/online/count`);
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  getNotifications(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/notifications/${userId}`);
  }

  markNotificationRead(notifId: string): Observable<any> {
    return this.http.put(`${this.BASE}/notifications/${notifId}/read`, {});
  }

  markAllNotificationsRead(userId: string): Observable<any> {
    return this.http.put(`${this.BASE}/notifications/read-all/${userId}`, {});
  }

  getUnreadNotifCount(userId: string): Observable<number> {
    return this.http.get<number>(`${this.BASE}/notifications/${userId}/unread-count`);
  }

  deleteNotification(notifId: string): Observable<any> {
    return this.http.delete(`${this.BASE}/notifications/${notifId}`);
  }

  // ─── Media ────────────────────────────────────────────────────────────────

  getRoomMedia(roomId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/media/room/${roomId}`);
  }

  deleteMedia(mediaId: string): Observable<any> {
    return this.http.delete(`${this.BASE}/media/${mediaId}`);
  }

  // ─── Room Manager (Admin) ─────────────────────────────────────────────────

  pinMessage(roomId: string, messageId: string): Observable<any> {
    return this.http.post(`${this.BASE}/room-manager/rooms/${roomId}/pin/${messageId}`, {});
  }

  unpinMessage(roomId: string, messageId: string): Observable<any> {
    return this.http.delete(`${this.BASE}/room-manager/rooms/${roomId}/pin/${messageId}`);
  }

  clearRoomHistory(roomId: string): Observable<any> {
    return this.http.delete(`${this.BASE}/room-manager/rooms/${roomId}/history`);
  }

  // ─── Platform Admin ───────────────────────────────────────────────────────

  getAdminDashboard(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/dashboard`);
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/admin/users`);
  }

  suspendUser(userId: string): Observable<any> {
    return this.http.put(`${this.BASE}/admin/users/${userId}/suspend`, {});
  }

  reactivateUser(userId: string): Observable<any> {
    return this.http.put(`${this.BASE}/admin/users/${userId}/reactivate`, {});
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/users/${userId}`);
  }

  getAllRoomsAdmin(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/admin/rooms`);
  }

  deleteRoomAdmin(roomId: string): Observable<any> {
    return this.http.delete(`${this.BASE}/admin/rooms/${roomId}`);
  }

  getActiveConnections(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/connections`);
  }

  getPlatformAnalytics(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/analytics`);
  }

  sendBroadcastNotification(data: { title: string; message: string; type?: string }): Observable<any> {
    return this.http.post(`${this.BASE}/admin/broadcast`, data);
  }

  getAuditLogs(): Observable<any> {
    return this.http.get(`${this.BASE}/admin/audit-logs`);
  }
}
