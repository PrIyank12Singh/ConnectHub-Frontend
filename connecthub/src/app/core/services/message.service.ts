import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Aggregated emoji reaction count on a message (GAP 4) */
export interface MessageReaction {
  emoji: string;
  count: number;
  /** userIds of reactors — used to check if the current user has reacted */
  reactorIds: string[];
}

export interface Message {
  messageId: string;
  roomId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'REACTION' | 'SYSTEM';
  mediaUrl?: string;
  replyToMessageId?: string;
  isEdited: boolean;
  isDeleted: boolean;
  deliveryStatus: 'SENT' | 'DELIVERED' | 'READ';
  sentAt: string;
  editedAt?: string;
  /** Live reaction aggregates (GAP 4) — updated in real-time via STOMP REACTION frames */
  reactions?: MessageReaction[];
}

export interface PagedMessages {
  content: Message[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly API = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  sendMessage(data: {
    roomId: string;
    senderId: string;
    content: string;
    type?: string;
    mediaUrl?: string;
    replyToMessageId?: string;
  }): Observable<Message> {
    return this.http.post<Message>(`${this.API}/messages`, data);
  }

  getMessagesByRoom(roomId: string, page = 0, size = 20): Observable<PagedMessages> {
    return this.http.get<PagedMessages>(`${this.API}/messages/room/${roomId}?page=${page}&size=${size}`);
  }

  getMessageById(messageId: string): Observable<Message> {
    return this.http.get<Message>(`${this.API}/messages/${messageId}`);
  }

  editMessage(messageId: string, content: string): Observable<Message> {
    return this.http.put<Message>(`${this.API}/messages/${messageId}`, { content });
  }

  deleteMessage(messageId: string): Observable<any> {
    return this.http.delete(`${this.API}/messages/${messageId}`);
  }

  searchMessages(roomId: string, keyword: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.API}/messages/room/${roomId}/search?keyword=${keyword}`);
  }

  updateDeliveryStatus(messageId: string, status: string): Observable<any> {
    return this.http.put(`${this.API}/messages/${messageId}/status?status=${status}`, {});
  }

  getMessageCount(roomId: string): Observable<any> {
    return this.http.get(`${this.API}/messages/room/${roomId}/count`);
  }
}
