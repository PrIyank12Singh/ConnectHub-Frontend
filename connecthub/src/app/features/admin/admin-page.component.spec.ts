import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AdminPageComponent } from './admin-page.component';
import { WebService } from '../../core/services/web.service';
import { AuthService } from '../../core/services/auth.service';
import { vi } from 'vitest';

describe('AdminPageComponent', () => {
  let component: AdminPageComponent;
  let fixture: ComponentFixture<AdminPageComponent>;
  let mockWebService: any;
  let mockAuthService: any;

  const mockUsers = [
    { userId: 'u1', username: 'alice', email: 'alice@example.com', role: 'USER', isActive: true },
    { userId: 'u2', username: 'bob', email: 'bob@example.com', role: 'USER', isActive: false }
  ];

  const mockRooms = [
    { roomId: 'r1', name: 'General', type: 'GROUP' },
    { roomId: 'r2', name: 'DM-1', type: 'DM' }
  ];

  const mockAnalytics = { totalUsers: 10, onlineUsers: 3, totalMedia: 25 };

  beforeEach(async () => {
    mockWebService = {
      getAdminDashboard: vi.fn(),
      getAllUsers: vi.fn(),
      suspendUser: vi.fn(),
      reactivateUser: vi.fn(),
      deleteUser: vi.fn(),
      getAllRoomsAdmin: vi.fn(),
      deleteRoomAdmin: vi.fn(),
      getActiveConnections: vi.fn(),
      getPlatformAnalytics: vi.fn(),
      sendBroadcastNotification: vi.fn(),
      getAuditLogs: vi.fn(),
    };
    mockAuthService = {
      getCurrentUser: vi.fn(),
    };

    // Default happy-path stubs
    mockWebService.getAdminDashboard.mockReturnValue(of({ onlineCount: 3, allUsers: mockUsers, allRooms: mockRooms }));
    mockWebService.getAllUsers.mockReturnValue(of(mockUsers));
    mockWebService.getAllRoomsAdmin.mockReturnValue(of(mockRooms));
    mockWebService.getPlatformAnalytics.mockReturnValue(of(mockAnalytics));
    mockWebService.getActiveConnections.mockReturnValue(of({ count: 3 }));
    mockWebService.getAuditLogs.mockReturnValue(of([]));
    mockAuthService.getCurrentUser.mockReturnValue({
      userId: 'admin-1', username: 'spriyank264', email: 'admin@gmail.com', role: 'PLATFORM_ADMIN'
    });

    await TestBed.configureTestingModule({
      imports: [AdminPageComponent, RouterTestingModule],
      providers: [
        { provide: WebService, useValue: mockWebService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Init ─────────────────────────────────────────────────────────────────

  it('should load dashboard on init', () => {
    expect(mockWebService.getAdminDashboard).toHaveBeenCalled();
  });

  it('should load users on init (default tab)', () => {
    expect(mockWebService.getAllUsers).toHaveBeenCalled();
  });

  it('should set currentUser from authService', () => {
    expect(component.currentUser?.username).toBe('spriyank264');
  });

  // ─── Tab switching ────────────────────────────────────────────────────────

  it('should load rooms when rooms tab selected', () => {
    component.selectTab('rooms');
    expect(mockWebService.getAllRoomsAdmin).toHaveBeenCalled();
    expect(component.activeTab).toBe('rooms');
  });

  it('should load analytics when analytics tab selected', () => {
    component.selectTab('analytics');
    expect(mockWebService.getPlatformAnalytics).toHaveBeenCalled();
    expect(component.activeTab).toBe('analytics');
  });

  it('should load connections when connections tab selected', () => {
    component.selectTab('connections');
    expect(mockWebService.getActiveConnections).toHaveBeenCalled();
  });

  it('should load audit logs when audit tab selected', () => {
    component.selectTab('audit');
    expect(mockWebService.getAuditLogs).toHaveBeenCalled();
  });

  // ─── Users ────────────────────────────────────────────────────────────────

  it('should populate users array after loadUsers', () => {
    expect(component.users.length).toBe(2);
    expect(component.users[0].username).toBe('alice');
  });

  it('should set usersError on loadUsers failure', () => {
    mockWebService.getAllUsers.mockReturnValue(
      throwError(() => ({ error: { message: 'Server error' } }))
    );
    component.loadUsers();
    expect(component.usersError).toBe('Server error');
  });

  it('should call suspendUser with correct userId', () => {
    mockWebService.suspendUser.mockReturnValue(of({}));
    mockWebService.getAllUsers.mockReturnValue(of(mockUsers));
    component.suspendUser(mockUsers[0]);
    expect(mockWebService.suspendUser).toHaveBeenCalledWith('u1');
  });

  it('should call reactivateUser with correct userId', () => {
    mockWebService.reactivateUser.mockReturnValue(of({}));
    mockWebService.getAllUsers.mockReturnValue(of(mockUsers));
    component.reactivateUser(mockUsers[1]);
    expect(mockWebService.reactivateUser).toHaveBeenCalledWith('u2');
  });

  it('should call deleteUser and reload users', () => {
    mockWebService.deleteUser.mockReturnValue(of({}));
    mockWebService.getAllUsers.mockReturnValue(of([]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.confirmDeleteUser(mockUsers[0]);
    component.confirmModal.onConfirm();
    expect(mockWebService.deleteUser).toHaveBeenCalledWith('u1');
  });

  // ─── Rooms ────────────────────────────────────────────────────────────────

  it('should populate rooms array after loadRooms', () => {
    component.loadRooms();
    expect(component.rooms.length).toBe(2);
  });

  it('should set roomsError on loadRooms failure', () => {
    mockWebService.getAllRoomsAdmin.mockReturnValue(
      throwError(() => ({ error: { message: 'Room fetch failed' } }))
    );
    component.loadRooms();
    expect(component.roomsError).toBe('Room fetch failed');
  });

  // ─── Analytics ───────────────────────────────────────────────────────────

  it('should populate analytics after loadAnalytics', () => {
    component.loadAnalytics();
    expect(component.analytics).toEqual(mockAnalytics);
  });

  it('should return correct analyticsMetrics entries', () => {
    component.analytics = mockAnalytics;
    const metrics = component.analyticsMetrics();
    expect(metrics.length).toBe(3);
    expect(metrics.find(m => m.label === 'total Users')?.value).toBe(10);
  });

  // ─── Broadcast ───────────────────────────────────────────────────────────

  it('should not send broadcast when title is empty', () => {
    component.broadcastTitle = '';
    component.broadcastMessage = 'Hello';
    component.sendBroadcast();
    expect(mockWebService.sendBroadcastNotification).not.toHaveBeenCalled();
  });

  it('should not send broadcast when message is empty', () => {
    component.broadcastTitle = 'Title';
    component.broadcastMessage = '';
    component.sendBroadcast();
    expect(mockWebService.sendBroadcastNotification).not.toHaveBeenCalled();
  });

  it('should call sendBroadcastNotification with correct payload', () => {
    mockWebService.sendBroadcastNotification.mockReturnValue(of({}));
    component.broadcastTitle = 'Meeting at 11pm';
    component.broadcastMessage = 'GTA V session';
    component.sendBroadcast();

    expect(mockWebService.sendBroadcastNotification).toHaveBeenCalledWith({
      title: 'Meeting at 11pm',
      message: 'GTA V session',
      type: 'SYSTEM'
    });
  });

  it('should set broadcastSuccess=true after successful send', () => {
    mockWebService.sendBroadcastNotification.mockReturnValue(of({}));
    component.broadcastTitle = 'T';
    component.broadcastMessage = 'M';
    component.sendBroadcast();
    expect(component.broadcastSuccess).toBeTruthy();
  });

  it('should clear broadcast fields after successful send', () => {
    mockWebService.sendBroadcastNotification.mockReturnValue(of({}));
    component.broadcastTitle = 'T';
    component.broadcastMessage = 'M';
    component.sendBroadcast();
    expect(component.broadcastTitle).toBe('');
    expect(component.broadcastMessage).toBe('');
  });

  it('should set broadcastError on failure', () => {
    mockWebService.sendBroadcastNotification.mockReturnValue(
      throwError(() => ({ error: { message: 'Failed to send broadcast.' } }))
    );
    component.broadcastTitle = 'T';
    component.broadcastMessage = 'M';
    component.sendBroadcast();
    expect(component.broadcastError).toBe('Failed to send broadcast.');
  });

  // ─── Audit Logs ──────────────────────────────────────────────────────────

  it('should populate auditLogs from flat array response', () => {
    const logs = [{ auditId: '1', action: 'DELETE_ROOM', actorId: 'admin-1' }];
    mockWebService.getAuditLogs.mockReturnValue(of(logs));
    component.loadAuditLogs();
    expect(component.auditLogs).toEqual(logs);
  });

  it('should handle { logs: [...] } response shape', () => {
    const logs = [{ auditId: '2', action: 'SUSPEND_USER' }];
    mockWebService.getAuditLogs.mockReturnValue(of({ logs }));
    component.loadAuditLogs();
    expect(component.auditLogs).toEqual(logs);
  });

  it('should set auditError on failure', () => {
    mockWebService.getAuditLogs.mockReturnValue(
      throwError(() => ({ error: { message: 'Failed to load audit logs.' } }))
    );
    component.loadAuditLogs();
    expect(component.auditError).toBe('Failed to load audit logs.');
  });

  // ─── auditIcon ────────────────────────────────────────────────────────────

  it('should return 🗑️ for delete actions', () => {
    expect(component.auditIcon('DELETE_ROOM')).toBe('🗑️');
  });

  it('should return 🚫 for suspend actions', () => {
    expect(component.auditIcon('SUSPEND_USER')).toBe('🚫');
  });

  it('should return ✅ for reactivate actions', () => {
    expect(component.auditIcon('REACTIVATE_USER')).toBe('✅');
  });

  it('should return 📋 for unknown actions', () => {
    expect(component.auditIcon('UNKNOWN_ACTION')).toBe('📋');
  });
});
