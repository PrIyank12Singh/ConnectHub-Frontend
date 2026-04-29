import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Room {
  roomId: string;
  name: string;
  description?: string;
  type: 'GROUP' | 'DM';
  createdById: string;
  avatarUrl?: string;
  isPrivate: boolean;
  maxMembers: number;
  memberCount: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  // ─── GAP 10 FIX ────────────────────────────────────────────────────────────
  /** UUID of the currently pinned message, or null/undefined if nothing is pinned. */
  pinnedMessageId?: string | null;
  // ───────────────────────────────────────────────────────────────────────────
}

export interface RoomMember {
  memberId: number;
  roomId: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  lastReadAt?: string;
  isMuted: boolean;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly API = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  createRoom(data: { name: string; type: string; createdById: string; description?: string }): Observable<Room> {
    return this.http.post<Room>(`${this.API}/rooms`, data);
  }

  getRoomsByUser(userId: string): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.API}/rooms/user/${userId}`);
  }

  getRoomById(roomId: string): Observable<Room> {
    return this.http.get<Room>(`${this.API}/rooms/${roomId}`);
  }

  updateRoom(roomId: string, data: any): Observable<Room> {
    return this.http.put<Room>(`${this.API}/rooms/${roomId}`, data);
  }

  deleteRoom(roomId: string): Observable<any> {
    return this.http.delete(`${this.API}/rooms/${roomId}`);
  }

  getMembers(roomId: string): Observable<RoomMember[]> {
    return this.http.get<RoomMember[]>(`${this.API}/rooms/${roomId}/members`);
  }

  addMember(roomId: string, data: { userId: string; role?: string }): Observable<RoomMember> {
    return this.http.post<RoomMember>(`${this.API}/rooms/${roomId}/members`, data);
  }

  removeMember(roomId: string, userId: string): Observable<any> {
    return this.http.delete(`${this.API}/rooms/${roomId}/members/${userId}`);
  }

  updateMemberRole(roomId: string, userId: string, role: string): Observable<any> {
    return this.http.put(`${this.API}/rooms/${roomId}/members/${userId}/role?role=${role}`, {});
  }

  muteMember(roomId: string, userId: string, mute: boolean): Observable<any> {
    return this.http.put(`${this.API}/rooms/${roomId}/members/${userId}/mute?mute=${mute}`, {});
  }

  updateLastRead(roomId: string, userId: string): Observable<any> {
    return this.http.put(`${this.API}/rooms/${roomId}/members/${userId}/read`, {});
  }

  // ─── GAP 10 FIX ────────────────────────────────────────────────────────────

  /**
   * Pin a message to the top of a room.
   * Calls POST /web/room-manager/rooms/{roomId}/pin/{messageId} on the
   * website-controller which forwards to room-service.
   * Only a Room Admin should invoke this.
   */
  pinMessage(roomId: string, messageId: string): Observable<Room> {
    return this.http.post<Room>(
      `${this.API}/web/room-manager/rooms/${roomId}/pin/${messageId}`,
      {}
    );
  }

  /**
   * Unpin the currently pinned message from a room.
   * Calls DELETE /web/room-manager/rooms/{roomId}/pin/{messageId}.
   */
  unpinMessage(roomId: string, messageId: string): Observable<Room> {
    return this.http.delete<Room>(
      `${this.API}/web/room-manager/rooms/${roomId}/pin/${messageId}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
}
