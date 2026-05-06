import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WebService } from './web.service';

describe('WebService', () => {
  let service: WebService;
  let http: HttpTestingController;
  const BASE = 'http://localhost:8080/web';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WebService]
    });
    service = TestBed.inject(WebService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // ─── Auth ────────────────────────────────────────────────────────────────

  it('should POST to /auth/login', () => {
    service.login({ email: 'a@b.com', password: 'pass' }).subscribe();
    const req = http.expectOne(`${BASE}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'pass' });
    req.flush({ accessToken: 'token' });
  });

  it('should POST to /auth/register', () => {
    const body = { username: 'u', email: 'e@e.com', password: 'p12345678', fullName: 'F N' };
    service.register(body).subscribe();
    const req = http.expectOne(`${BASE}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should GET profile by userId', () => {
    service.getProfile('uid-1').subscribe();
    const req = http.expectOne(`${BASE}/auth/profile/uid-1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  // ─── Admin — Users ───────────────────────────────────────────────────────

  it('should GET all users from admin endpoint', () => {
    service.getAllUsers().subscribe();
    const req = http.expectOne(`${BASE}/admin/users`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should PUT to suspend user', () => {
    service.suspendUser('user-1').subscribe();
    const req = http.expectOne(`${BASE}/admin/users/user-1/suspend`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should PUT to reactivate user', () => {
    service.reactivateUser('user-1').subscribe();
    const req = http.expectOne(`${BASE}/admin/users/user-1/reactivate`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should DELETE user', () => {
    service.deleteUser('user-1').subscribe();
    const req = http.expectOne(`${BASE}/admin/users/user-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  // ─── Admin — Rooms ───────────────────────────────────────────────────────

  it('should GET all rooms from admin endpoint', () => {
    service.getAllRoomsAdmin().subscribe();
    const req = http.expectOne(`${BASE}/admin/rooms`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should DELETE room from admin endpoint', () => {
    service.deleteRoomAdmin('room-1').subscribe();
    const req = http.expectOne(`${BASE}/admin/rooms/room-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  // ─── Admin — Analytics & Broadcast ───────────────────────────────────────

  it('should GET platform analytics', () => {
    service.getPlatformAnalytics().subscribe();
    const req = http.expectOne(`${BASE}/admin/analytics`);
    expect(req.request.method).toBe('GET');
    req.flush({ totalUsers: 10, onlineUsers: 3, totalMedia: 5 });
  });

  it('should POST broadcast notification', () => {
    const payload = { title: 'Hello', message: 'World', type: 'SYSTEM' };
    service.sendBroadcastNotification(payload).subscribe();
    const req = http.expectOne(`${BASE}/admin/broadcast`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('should GET audit logs', () => {
    service.getAuditLogs().subscribe();
    const req = http.expectOne(`${BASE}/admin/audit-logs`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  // ─── Rooms ───────────────────────────────────────────────────────────────

  it('should GET rooms by user', () => {
    service.getRoomsByUser('uid-1').subscribe();
    const req = http.expectOne(`${BASE}/rooms/user/uid-1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should POST to create room', () => {
    const body = { name: 'Room 1', type: 'GROUP', createdById: 'uid-1' };
    service.createRoom(body).subscribe();
    const req = http.expectOne(`${BASE}/rooms`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should DELETE room', () => {
    service.deleteRoom('room-1').subscribe();
    const req = http.expectOne(`${BASE}/rooms/room-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  // ─── Messages ────────────────────────────────────────────────────────────

  it('should POST to send message', () => {
    const body = { roomId: 'r1', senderId: 'u1', content: 'Hello' };
    service.sendMessage(body).subscribe();
    const req = http.expectOne(`${BASE}/messages`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should GET messages by room with default pagination', () => {
    service.getMessagesByRoom('room-1').subscribe();
    const req = http.expectOne(`${BASE}/messages/room/room-1?page=0&size=20`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [] });
  });

  it('should DELETE message', () => {
    service.deleteMessage('msg-1').subscribe();
    const req = http.expectOne(`${BASE}/messages/msg-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  // ─── Notifications ───────────────────────────────────────────────────────

  it('should GET notifications by userId', () => {
    service.getNotifications('uid-1').subscribe();
    const req = http.expectOne(`${BASE}/notifications/uid-1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should GET unread notification count', () => {
    service.getUnreadNotifCount('uid-1').subscribe();
    const req = http.expectOne(`${BASE}/notifications/uid-1/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush(5);
  });

  it('should PUT mark all notifications read', () => {
    service.markAllNotificationsRead('uid-1').subscribe();
    const req = http.expectOne(`${BASE}/notifications/read-all/uid-1`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });
});
