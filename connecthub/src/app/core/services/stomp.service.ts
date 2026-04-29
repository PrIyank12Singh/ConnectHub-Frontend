import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

// ─── Payload shapes matching backend ChatPayload / OutboundEvent ──────────────

export type StompMessageType =
  | 'CHAT_MESSAGE'
  | 'TYPING_INDICATOR'
  | 'READ_RECEIPT'
  | 'REACTION'
  | 'PRESENCE_UPDATE'
  | 'MESSAGE_EDIT'
  | 'MESSAGE_DELETE'
  | 'ROOM_JOIN'
  | 'ROOM_LEAVE'
  | 'PING';

/** Inbound frame shape sent TO /app/chat.* */
export interface ChatPayload {
  type: StompMessageType;
  // CHAT_MESSAGE
  senderId?: string;
  roomId?: string;
  content?: string;
  messageType?: 'TEXT' | 'IMAGE' | 'FILE';
  mediaUrl?: string;
  replyToId?: string;
  // TYPING_INDICATOR
  isTyping?: boolean;
  // READ_RECEIPT
  readerId?: string;
  upToMessageId?: string;
  // REACTION
  messageId?: string;
  emoji?: string;
  // PRESENCE_UPDATE
  userId?: string;
  status?: string;
  customMessage?: string;
  // MESSAGE_EDIT
  editorId?: string;
  newContent?: string;
  // MESSAGE_DELETE
  deleterId?: string;
  // PING
  sessionId?: string;
}

/** Outbound event shape broadcast FROM /topic/room/{roomId} */
export interface OutboundEvent {
  type: StompMessageType;
  roomId?: string;
  userId?: string;
  timestamp?: string;
  // CHAT_MESSAGE
  messageId?: string;
  senderId?: string;
  content?: string;
  messageType?: string;
  mediaUrl?: string;
  replyToId?: string;
  deliveryStatus?: string;
  // TYPING_INDICATOR
  isTyping?: boolean;
  // READ_RECEIPT
  readerId?: string;
  upToMessageId?: string;
  // REACTION
  emoji?: string;
  // PRESENCE / EDIT / DELETE / JOIN / LEAVE
  status?: string;
  customMessage?: string;
  newContent?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  username?: string;
}

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

@Injectable({ providedIn: 'root' })
export class StompService implements OnDestroy {

  // ── Public observables ───────────────────────────────────────────────────
  /** All events arriving on the currently subscribed room topic */
  private roomEventsSubject = new Subject<OutboundEvent>();
  roomEvents$: Observable<OutboundEvent> = this.roomEventsSubject.asObservable();

  /** Convenience: only CHAT_MESSAGE events */
  chatMessages$: Observable<OutboundEvent> = this.roomEvents$.pipe(
    filter(e => e.type === 'CHAT_MESSAGE')
  );

  /** Convenience: only TYPING_INDICATOR events */
  typingEvents$: Observable<OutboundEvent> = this.roomEvents$.pipe(
    filter(e => e.type === 'TYPING_INDICATOR')
  );

  /** Convenience: only READ_RECEIPT events */
  readReceipts$: Observable<OutboundEvent> = this.roomEvents$.pipe(
    filter(e => e.type === 'READ_RECEIPT')
  );

  /** Convenience: only MESSAGE_EDIT events */
  messageEdits$: Observable<OutboundEvent> = this.roomEvents$.pipe(
    filter(e => e.type === 'MESSAGE_EDIT')
  );

  /** Convenience: only MESSAGE_DELETE events */
  messageDeletes$: Observable<OutboundEvent> = this.roomEvents$.pipe(
    filter(e => e.type === 'MESSAGE_DELETE')
  );

  /** Convenience: only REACTION events (GAP 4) */
  reactions$: Observable<OutboundEvent> = this.roomEvents$.pipe(
    filter(e => e.type === 'REACTION')
  );

  /** Connection state for UI indicators */
  private stateSubject = new BehaviorSubject<ConnectionState>('DISCONNECTED');
  connectionState$: Observable<ConnectionState> = this.stateSubject.asObservable();

  // ── Private ──────────────────────────────────────────────────────────────
  private client: Client | null = null;
  private roomSubscription: StompSubscription | null = null;
  private userSubscription: StompSubscription | null = null;
  private currentRoomId: string | null = null;

  // Direct connection to websocket-handler (bypass gateway for SockJS probe requests)
  private readonly WS_URL = 'http://localhost:8087/ws';

  // ─── Connect ─────────────────────────────────────────────────────────────

  /**
   * Call once after login / on app init.
   * @param token   JWT access token (without "Bearer " prefix)
   * @param userId  Current user's ID for personal queue subscription
   */
  connect(token: string, userId: string): void {
    if (this.client?.active) {
      console.log('[STOMP] Already connected — skipping');
      return;
    }

    this.stateSubject.next('CONNECTING');

    this.client = new Client({
      // SockJS factory — provides WebSocket with HTTP long-polling fallback
      webSocketFactory: () => new SockJS(this.WS_URL) as any,

      // JWT passed as STOMP CONNECT Authorization header (PDF §2.2, §4.7, §6)
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      // Heartbeat: send every 20s, expect every 20s (keeps connection alive)
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,

      // Auto-reconnect: wait 5s before retry
      reconnectDelay: 5000,

      onConnect: () => {
        console.log('[STOMP] Connected ✓');
        this.stateSubject.next('CONNECTED');

        // Subscribe to personal queue for notifications and DM alerts
        this.subscribeToUserQueue(userId);

        // Re-subscribe to room if we had one before a reconnect
        if (this.currentRoomId) {
          this.subscribeToRoomTopic(this.currentRoomId);
        }
      },

      onDisconnect: () => {
        console.log('[STOMP] Disconnected');
        this.stateSubject.next('DISCONNECTED');
      },

      onStompError: (frame) => {
        console.error('[STOMP] Broker error:', frame.headers['message'], frame.body);
        this.stateSubject.next('ERROR');
      },

      onWebSocketError: (event) => {
        console.error('[STOMP] WebSocket error:', event);
        this.stateSubject.next('ERROR');
      },
    });

    this.client.activate();
  }

  // ─── Disconnect ──────────────────────────────────────────────────────────

  disconnect(): void {
    this.roomSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
    this.roomSubscription = null;
    this.userSubscription = null;
    this.currentRoomId = null;

    if (this.client?.active) {
      this.client.deactivate();
    }
    this.stateSubject.next('DISCONNECTED');
  }

  // ─── Room subscription ────────────────────────────────────────────────────

  /**
   * Subscribe to a room's topic. Automatically unsubscribes from the
   * previous room first. Call this every time the user selects a new room.
   */
  subscribeToRoom(roomId: string): void {
    if (!this.client?.active) {
      console.warn('[STOMP] Cannot subscribe — not connected');
      this.currentRoomId = roomId; // remember for after reconnect
      return;
    }

    // Unsubscribe from previous room
    if (this.roomSubscription) {
      this.roomSubscription.unsubscribe();
      this.roomSubscription = null;
    }

    this.currentRoomId = roomId;
    this.subscribeToRoomTopic(roomId);
  }

  unsubscribeFromRoom(): void {
    this.roomSubscription?.unsubscribe();
    this.roomSubscription = null;
    this.currentRoomId = null;
  }

  // ─── Publish helpers ─────────────────────────────────────────────────────

  /**
   * Send a chat message via STOMP /app/chat.send (PDF §2.3, §4.7).
   * The backend persists it and broadcasts the saved Message to
   * /topic/room/{roomId} so all subscribers receive it in real time.
   */
  sendChatMessage(payload: {
    senderId: string;
    roomId: string;
    content: string;
    messageType?: 'TEXT' | 'IMAGE' | 'FILE';
    mediaUrl?: string;
    replyToId?: string;
  }): void {
    this.publish('/app/chat.send', {
      type: 'CHAT_MESSAGE',
      ...payload,
      messageType: payload.messageType ?? 'TEXT',
    });
  }

  /**
   * Broadcast a typing indicator (PDF §2.6).
   * Call on keyup; call again with isTyping=false after 3s debounce.
   */
  sendTypingIndicator(senderId: string, roomId: string, isTyping: boolean): void {
    this.publish('/app/chat.typing', {
      type: 'TYPING_INDICATOR',
      senderId,
      roomId,
      isTyping,
    });
  }

  /**
   * Broadcast a read receipt up to the latest visible message (PDF §2.6).
   */
  sendReadReceipt(readerId: string, roomId: string, upToMessageId: string): void {
    this.publish('/app/chat.read', {
      type: 'READ_RECEIPT',
      readerId,
      roomId,
      upToMessageId,
    });
  }

  /**
   * Send an emoji reaction (PDF §2.3).
   */
  sendReaction(senderId: string, messageId: string, emoji: string): void {
    this.publish('/app/chat.react', {
      type: 'REACTION',
      senderId,
      messageId,
      emoji,
    });
  }

  /**
   * Keep-alive ping — call every 25s to prevent stale session cleanup (PDF §6).
   */
  sendPing(sessionId: string): void {
    this.publish('/app/chat.ping', {
      type: 'PING',
      sessionId,
    });
  }

  /** Is the STOMP client currently active and connected? */
  get isConnected(): boolean {
    return this.client?.active === true &&
           this.stateSubject.value === 'CONNECTED';
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private subscribeToRoomTopic(roomId: string): void {
    if (!this.client?.active) return;

    this.roomSubscription = this.client.subscribe(
      `/topic/room/${roomId}`,
      (message: IMessage) => this.handleIncoming(message)
    );
    console.log(`[STOMP] Subscribed to /topic/room/${roomId}`);
  }

  private subscribeToUserQueue(userId: string): void {
    if (!this.client?.active) return;

    this.userSubscription = this.client.subscribe(
      `/topic/user/${userId}`,
      (message: IMessage) => this.handleIncoming(message)
    );
    console.log(`[STOMP] Subscribed to /topic/user/${userId}`);
  }

  private handleIncoming(message: IMessage): void {
    try {
      const event: OutboundEvent = JSON.parse(message.body);
      this.roomEventsSubject.next(event);
    } catch (err) {
      console.error('[STOMP] Failed to parse frame:', message.body, err);
    }
  }

  private publish(destination: string, payload: ChatPayload): void {
    if (!this.client?.active) {
      console.warn(`[STOMP] Cannot publish to ${destination} — not connected`);
      return;
    }
    this.client.publish({
      destination,
      body: JSON.stringify(payload),
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
