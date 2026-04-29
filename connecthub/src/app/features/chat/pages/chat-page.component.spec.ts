import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Subject, of } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { ChatPageComponent } from './chat-page.component';
import { Message } from '../../../core/services/message.service';

// Minimal mocks for injected services
const makeStompMock = () => {
  const roomEvents$ = new Subject<any>();
  return {
    roomEvents$,
    isConnected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendTypingIndicator: vi.fn(),
    subscribeToRoom: vi.fn(),
  };
};

const makeWebServiceMock = () => ({
  getProfile: vi.fn((id: string) => of({ username: `user-${id}` })),
  updateProfile: vi.fn((userId: string, data: any) => of({ userId, ...data, avatarUrl: data.avatarUrl })),
});

const makeMessageServiceMock = () => ({ sendMessage: vi.fn(), editMessage: vi.fn(), deleteMessage: vi.fn(), getMessagesByRoom: vi.fn() });
const makeRoomServiceMock = () => ({ getRoomsByUser: vi.fn() });
const makeMediaServiceMock = () => ({
  getMessageType: vi.fn(() => 'TEXT'),
  formatFileSize: vi.fn(() => '1 MB'),
  uploadImageWithProgress: vi.fn(),
});
const makeThemeServiceMock = () => ({ isDark$: of(false), toggle: vi.fn() });
const makeNotificationServiceMock = () => ({ refreshUnreadCount: vi.fn() });
const makePresenceServiceMock = () => ({ goOnline: vi.fn(() => of({})), goOffline: vi.fn(() => of({})), updateStatus: vi.fn(() => of({})), disconnectSession: vi.fn(() => of({})) });
const makeAuthServiceMock = () => ({
  getCurrentUser: vi.fn(() => ({ userId: 'u1', username: 'u1' })),
  getToken: vi.fn(() => 'tok'),
  updateCurrentUser: vi.fn(),
});

describe('ChatPageComponent STOMP and typing', () => {
  let stompMock: any;
  let webMock: any;
  let comp: ChatPageComponent;

  beforeEach(() => {
    stompMock = makeStompMock();
    webMock = makeWebServiceMock();

    comp = new ChatPageComponent(
      makeAuthServiceMock() as any,
      makeRoomServiceMock() as any,
      makeMessageServiceMock() as any,
      makeMediaServiceMock() as any,
      {} as any, // router
      makeThemeServiceMock() as any,
      makeNotificationServiceMock() as any,
      makePresenceServiceMock() as any,
      stompMock,
      webMock
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appends incoming CHAT_MESSAGE via handleStompEvent', () => {
    comp.selectedRoom = { roomId: 'r1' } as any;
    const ev = { type: 'CHAT_MESSAGE', roomId: 'r1', messageId: 'm1', senderId: 'u2', content: 'hello', messageType: 'TEXT', timestamp: new Date().toISOString() };
    comp['handleStompEvent'](ev as any);
    expect(comp.messages.length).toBe(1);
    expect(comp.messages[0].content).toBe('hello');
  });

  it('applies MESSAGE_EDIT and MESSAGE_DELETE', () => {
    comp.messages = [{ messageId: 'm1', roomId: 'r1', senderId: 'u2', content: 'old', type: 'TEXT', isEdited: false, isDeleted: false, deliveryStatus: 'SENT', sentAt: new Date().toISOString() } as Message];
    comp['handleStompEvent']({ type: 'MESSAGE_EDIT', messageId: 'm1', newContent: 'new' } as any);
    expect(comp.messages[0].content).toBe('new');
    comp['handleStompEvent']({ type: 'MESSAGE_DELETE', messageId: 'm1' } as any);
    expect(comp.messages[0].isDeleted).toBe(true);
  });

  it('updates typingUsers and resolves username', async () => {
    comp.selectedRoom = { roomId: 'r1' } as any;
    const ev = { type: 'TYPING_INDICATOR', userId: 'u3', roomId: 'r1', isTyping: true };
    comp['handleStompEvent'](ev as any);
    expect(comp.typingUsers.has('u3')).toBe(true);
    // username should be cached after mock webService resolves
    // give microtask time
    await Promise.resolve();
    expect(comp['typingNameCache'].get('u3')).toBe('user-u3');
    comp['handleStompEvent']({ ...ev, isTyping: false } as any);
    expect(comp.typingUsers.has('u3')).toBe(false);
  });

  it('handles READ_RECEIPT delivery updates', () => {
    comp.user = { userId: 'u1' } as any;
    comp.messages = [
      { messageId: 'm1', roomId: 'r1', senderId: 'u1', content: 'x', type: 'TEXT', isEdited: false, isDeleted: false, deliveryStatus: 'SENT', sentAt: new Date().toISOString() } as Message,
    ];
    comp['handleStompEvent']({ type: 'READ_RECEIPT', messageId: 'm1', deliveryStatus: 'READ' } as any);
    expect(comp.messages[0].deliveryStatus).toBe('READ');
  });

  it('debounces typing sends via onInputKeyup', () => {
    vi.useFakeTimers();
    comp.user = { userId: 'u1' } as any;
    comp.selectedRoom = { roomId: 'r1' } as any;
    comp.onInputKeyup();
    expect(stompMock.sendTypingIndicator).toHaveBeenCalledWith('u1', 'r1', true);
    // advance time less than debounce
    vi.advanceTimersByTime(2000);
    // no false yet
    expect(stompMock.sendTypingIndicator).toHaveBeenCalledTimes(1);
    // advance past 3s
    vi.advanceTimersByTime(1500);
    expect(stompMock.sendTypingIndicator).toHaveBeenCalledWith('u1', 'r1', false);
    vi.useRealTimers();
  });

  it('uploads profile photo and persists avatarUrl', () => {
    const uploadEvents$ = new Subject<any>();
    const authMock = makeAuthServiceMock() as any;
    const mediaMock = makeMediaServiceMock() as any;
    const webMock = makeWebServiceMock() as any;
    mediaMock.uploadImageWithProgress.mockReturnValue(uploadEvents$.asObservable());

    comp = new ChatPageComponent(
      authMock,
      makeRoomServiceMock() as any,
      makeMessageServiceMock() as any,
      mediaMock,
      {} as any,
      makeThemeServiceMock() as any,
      makeNotificationServiceMock() as any,
      makePresenceServiceMock() as any,
      stompMock,
      webMock
    );

    comp.user = { userId: 'u1', username: 'u1' } as any;
    comp.profilePhotoFile = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });

    comp.uploadProfilePhoto();
    uploadEvents$.next({ type: HttpEventType.UploadProgress, loaded: 25, total: 100 });
    expect(comp.profilePhotoUploadProgress).toBe(25);

    uploadEvents$.next({ type: HttpEventType.Response, body: { url: 'http://cdn/avatar.jpg' } });

    expect(webMock.updateProfile).toHaveBeenCalledWith('u1', { avatarUrl: 'http://cdn/avatar.jpg' });
    expect(authMock.updateCurrentUser).toHaveBeenCalledWith(expect.objectContaining({ avatarUrl: 'http://cdn/avatar.jpg' }));
    expect(comp.user.avatarUrl).toBe('http://cdn/avatar.jpg');
  });
});
