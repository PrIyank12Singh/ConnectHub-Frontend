
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RoomService, Room } from '../../../core/services/room.service';
import { MessageService, Message } from '../../../core/services/message.service';
import { MediaService } from '../../../core/services/media.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PresenceService } from '../../../core/services/presence.service';
import { WebService } from '../../../core/services/web.service';
import { StompService, OutboundEvent } from '../../../core/services/stomp.service';
import { NotificationBellComponent } from '../components/notification-bell/notification-bell.component';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBellComponent],
  template: `
    <div class="flex h-screen bg-gray-100 dark:bg-gray-900">
      <!-- Sidebar -->
      <div class="w-72 bg-white dark:bg-gray-800 flex flex-col border-r border-gray-200 dark:border-gray-700 shrink-0">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="bg-blue-600 p-1.5 rounded-lg text-white text-sm">CH</div>
              <span class="font-bold text-gray-900 dark:text-white">ConnectHub</span>
            </div>
            <div class="flex gap-1 items-center">
              @if (user) {
                <app-notification-bell [userId]="user.userId" />
              }
              <button (click)="themeService.toggle()"
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                {{ (themeService.isDark$ | async) ? '☀' : '☾' }}
              </button>
              <button (click)="handleLogout()"
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500">
                ⇦
              </button>
            </div>
          </div>

          <!-- User info + status picker -->
          <div class="flex items-center gap-2">
            <div class="relative">
              <input #avatarInput type="file" class="hidden" accept="image/*" (change)="onProfilePhotoSelected($event)" />
              <button type="button"
                (click)="avatarInput.click()"
                class="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-sm font-bold border border-transparent hover:border-blue-300 transition relative">
                @if (user?.avatarUrl) {
                  <img [src]="user.avatarUrl" alt="Profile photo" class="w-full h-full object-cover" />
                } @else {
                  {{ user?.username?.charAt(0)?.toUpperCase() }}
                }
                <span class="absolute inset-0 bg-black/0 hover:bg-black/20 transition flex items-center justify-center text-[10px] opacity-0 hover:opacity-100">✎</span>
              </button>
              <!-- Presence dot -->
              <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                    [ngClass]="presenceDotClass"></span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ user?.username }}</p>
              <!-- Status dropdown -->
              <select (change)="onStatusChange($event)"
                class="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-none outline-none cursor-pointer">
                <option value="ONLINE"    [selected]="currentStatus === 'ONLINE'">Online</option>
                <option value="AWAY"      [selected]="currentStatus === 'AWAY'">Away</option>
                <option value="DND"       [selected]="currentStatus === 'DND'">Do Not Disturb</option>
                <option value="INVISIBLE" [selected]="currentStatus === 'INVISIBLE'">Invisible</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Rooms -->
        <div class="flex-1 overflow-y-auto p-3">
          <div class="flex items-center justify-between mb-2 px-1">
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rooms</span>
            <button (click)="showCreateRoom = true"
              class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 font-bold text-lg leading-none">
              +
            </button>
          </div>

          @if (rooms.length === 0) {
            <p class="text-xs text-gray-400 text-center mt-8">No rooms yet.<br/>Create one to get started!</p>
          }

          @for (room of rooms; track room.roomId) {
            <button (click)="selectRoom(room)"
              class="w-full text-left px-3 py-2.5 rounded-xl mb-1 flex items-center gap-2 transition"
              [class.bg-blue-600]="selectedRoom?.roomId === room.roomId"
              [class.text-white]="selectedRoom?.roomId === room.roomId"
              [class.hover:bg-gray-100]="selectedRoom?.roomId !== room.roomId"
              [class.dark:hover:bg-gray-700]="selectedRoom?.roomId !== room.roomId"
              [class.text-gray-700]="selectedRoom?.roomId !== room.roomId"
              [class.dark:text-gray-300]="selectedRoom?.roomId !== room.roomId">
              <span class="text-xs">#</span>
              <span class="text-sm font-medium truncate flex-1">{{ room.name }}</span>
              <span class="text-xs opacity-60">{{ room.memberCount }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 flex flex-col min-w-0">
        @if (selectedRoom) {
          <!-- Chat header -->
          <div class="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 shrink-0">
            <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 font-bold">#</div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">{{ selectedRoom.name }}</p>
              <p class="text-xs text-gray-500">{{ selectedRoom.memberCount }} members · {{ selectedRoom.type }}</p>
            </div>
            <!-- Search -->
            <div class="ml-auto flex items-center gap-2">
              <input [(ngModel)]="searchKeyword" (keyup.enter)="searchMessages()"
                placeholder="Search messages..."
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
              <button (click)="searchMessages()" class="text-blue-600 hover:text-blue-700 text-sm font-medium">Search</button>
              @if (searchKeyword) {
                <button (click)="clearSearch()" class="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              }
              @if (user && selectedRoom && user.userId === selectedRoom.createdById) {
                <button (click)="toggleSettings()" title="Room settings"
                  class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600">⚙️</button>
              }
            </div>
          </div>

          <!-- Messages -->
          <div class="flex-1 overflow-y-auto p-6 space-y-3" #messagesContainer>
            @if (loadingMessages) {
              <div class="flex justify-center pt-8">
                <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            }
            @if (!loadingMessages && messages.length === 0) {
              <div class="flex flex-col items-center justify-center h-full text-gray-400 pb-20">
                <div class="text-5xl mb-4">🙂</div>
                <p class="text-lg font-medium text-gray-600 dark:text-gray-400">No messages yet</p>
                <p class="text-sm">Say hello to start the conversation! 👋</p>
              </div>
            }
            @for (msg of messages; track msg.messageId) {
              <div class="flex" [class.justify-end]="msg.senderId === user?.userId" [class.justify-start]="msg.senderId !== user?.userId">
                @if (msg.senderId !== user?.userId) {
                  <div class="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-300 mr-2 shrink-0 mt-1">
                    {{ msg.senderId.charAt(0).toUpperCase() }}
                  </div>
                }
                <div class="max-w-xs lg:max-w-md">
                  <div class="px-4 py-2.5 rounded-2xl overflow-hidden"
                    [class.bg-blue-600]="msg.senderId === user?.userId"
                    [class.text-white]="msg.senderId === user?.userId"
                    [class.rounded-br-sm]="msg.senderId === user?.userId"
                    [class.bg-white]="msg.senderId !== user?.userId"
                    [class.dark:bg-gray-800]="msg.senderId !== user?.userId"
                    [class.text-gray-900]="msg.senderId !== user?.userId"
                    [class.dark:text-white]="msg.senderId !== user?.userId"
                    [class.rounded-bl-sm]="msg.senderId !== user?.userId"
                    [class.shadow-sm]="msg.senderId !== user?.userId">
                    @if (msg.isDeleted) {
                      <p class="text-sm italic opacity-60">Message deleted</p>
                    } @else if (msg.type === 'IMAGE' && msg.mediaUrl) {
                      <img [src]="msg.mediaUrl" alt="Shared image"
                        class="rounded-xl max-w-full max-h-64 object-cover cursor-pointer"
                        (click)="openMediaInNewTab(msg.mediaUrl!)"
                        (error)="onImageError($event)" />
                      @if (msg.content && msg.content !== msg.mediaUrl) {
                        <p class="text-sm break-words mt-1">{{ msg.content }}</p>
                      }
                    } @else if (msg.type === 'FILE' && msg.mediaUrl) {
                      <div class="flex items-center gap-2 cursor-pointer" (click)="openMediaInNewTab(msg.mediaUrl!)">
                        <div class="text-2xl">📄</div>
                        <div class="min-w-0">
                          <p class="text-sm font-medium truncate">{{ extractFileName(msg.mediaUrl!) }}</p>
                          <p class="text-xs opacity-70">Click to download</p>
                        </div>
                      </div>
                    } @else {
                      <p class="text-sm break-words">{{ msg.content }}</p>
                    }
                  </div>
                  <div class="flex items-center gap-1 mt-1 px-1" [class.justify-end]="msg.senderId === user?.userId">
                    <span class="text-xs text-gray-400">{{ formatTime(msg.sentAt) }}</span>
                    @if (msg.isEdited) { <span class="text-xs text-gray-400">· edited</span> }
                    @if (msg.senderId === user?.userId) {
                      <span class="text-xs text-blue-400">
                        {{ msg.deliveryStatus === 'READ' ? '✓✓' : msg.deliveryStatus === 'DELIVERED' ? '✓✓' : '✓' }}
                      </span>
                    }
                  </div>
                  @if (msg.senderId === user?.userId && !msg.isDeleted && msg.type === 'TEXT') {
                    <div class="flex gap-2 px-1 mt-0.5 justify-end">
                      <button (click)="startEdit(msg)" class="text-xs text-gray-400 hover:text-blue-500">Edit</button>
                      <button (click)="handleDeleteMessage(msg.messageId)" class="text-xs text-gray-400 hover:text-red-500">Delete</button>
                    </div>
                  }
                  @if (msg.senderId === user?.userId && !msg.isDeleted && msg.type !== 'TEXT') {
                    <div class="flex gap-2 px-1 mt-0.5 justify-end">
                      <button (click)="handleDeleteMessage(msg.messageId)" class="text-xs text-gray-400 hover:text-red-500">Delete</button>
                    </div>
                  }
                </div>
              </div>
            }
            <div #messagesEnd></div>
          </div>

          <!-- Upload progress bar -->
          @if (uploadProgress > 0 && uploadProgress < 100) {
            <div class="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-blue-600 dark:text-blue-400">Uploading {{ uploadingFileName }}...</span>
                <span class="text-xs text-blue-600 dark:text-blue-400">{{ uploadProgress }}%</span>
              </div>
              <div class="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                <div class="bg-blue-600 h-1.5 rounded-full transition-all duration-200" [style.width.%]="uploadProgress"></div>
              </div>
            </div>
          }

          <!-- File preview banner -->
          @if (pendingFile) {
            <div class="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center gap-3">
              @if (pendingFilePreview) {
                <img [src]="pendingFilePreview" class="w-10 h-10 rounded-lg object-cover" alt="preview" />
              } @else {
                <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xl">📎</div>
              }
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ pendingFile.name }}</p>
                <p class="text-xs text-gray-500">{{ mediaService.formatFileSize(pendingFile.size) }}</p>
              </div>
              <button (click)="clearPendingFile()" class="text-gray-400 hover:text-red-500 transition text-lg leading-none">✕</button>
            </div>
          }

          <!-- Edit banner -->
          @if (editingMessage) {
            <div class="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between">
              <span class="text-sm text-blue-600 dark:text-blue-400">✎ Editing message</span>
              <button (click)="cancelEdit()" class="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          }

          <!-- Message input -->
          <div class="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <div *ngIf="typingUsers.size > 0" class="px-2 pb-2 text-xs text-gray-500">
              <ng-container *ngIf="typingUsers.size === 1">
                <ng-container *ngFor="let id of typingUsers">
                  {{ typingNameCache.get(id) || 'Someone' }} is typing...
                </ng-container>
              </ng-container>
              <ng-container *ngIf="typingUsers.size > 1">{{ typingUsers.size }} people are typing...</ng-container>
            </div>
            <div class="flex gap-2 items-center">
              <input #fileInput type="file" class="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                (change)="onFileSelected($event)" />
              <button type="button" (click)="fileInput.click()" [disabled]="!!editingMessage || uploading"
                title="Attach file or image"
                class="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition disabled:opacity-40 shrink-0">
                📎
              </button>
                <div class="relative">
                  <button type="button" (click)="toggleEmojiPicker()"
                    title="Insert emoji"
                    class="p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition shrink-0">
                    😊
                  </button>
                  <div *ngIf="showEmojiPicker" class="absolute bottom-12 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 shadow-xl grid grid-cols-7 gap-1.5 z-50 min-w-[20rem]">
                    <button *ngFor="let emoji of emojiList" type="button" (click)="insertEmoji(emoji)" class="w-9 h-9 text-[20px] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center leading-none">{{ emoji }}</button>
                  </div>
                </div>
              <input [(ngModel)]="newMessage" name="message"
                (keyup.enter)="handleSend()" (keyup)="onInputKeyup()"
                [placeholder]="editingMessage ? 'Edit your message...' : pendingFile ? 'Add a caption (optional)...' : 'Message #' + selectedRoom.name"
                class="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" (click)="handleSend()"
                [disabled]="(!newMessage.trim() && !pendingFile) || uploading"
                class="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50 shrink-0">
                @if (uploading) {
                  <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                } @else {
                  {{ editingMessage ? '✓' : '➤' }}
                }
              </button>
            </div>
          </div>
        } @else {
          <div class="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div class="text-6xl mb-4 opacity-30">🙂</div>
            <h2 class="text-xl font-semibold text-gray-600 dark:text-gray-400">Welcome to ConnectHub</h2>
            <p class="text-sm mt-1">Select a room from the sidebar to start chatting</p>
            <button type="button" (click)="showCreateRoom = true"
              class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium">
              + Create your first room
            </button>
          </div>
        }
      </div>

      <!-- Create Room Modal -->
      @if (showSettings) {
        <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Room Settings</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add member by user ID</label>
                <input [(ngModel)]="newMemberId" placeholder="user-id (UUID)"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div class="flex gap-3">
                <button type="button" (click)="toggleSettings()"
                  class="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
                <button type="button" (click)="addMemberById()" [disabled]="!newMemberId.trim() || addingMember"
                  class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50">{{ addingMember ? 'Adding...' : 'Add Member' }}</button>
              </div>
            </div>
          </div>
        </div>
      }
      @if (showCreateRoom) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create a Room</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Name</label>
                <input [(ngModel)]="newRoomName"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. General Chat" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select [(ngModel)]="newRoomType"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="GROUP">Group Room</option>
                  <option value="DM">Direct Message</option>
                </select>
              </div>
              <div class="flex gap-3">
                <button type="button" (click)="showCreateRoom = false"
                  class="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  Cancel
                </button>
                <button type="button" (click)="handleCreateRoom()" [disabled]="!newRoomName.trim() || creatingRoom"
                  class="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50">
                  {{ creatingRoom ? 'Creating...' : 'Create' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (profilePhotoModalOpen) {
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700">
            <div class="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Update profile photo</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Photos are center-cropped to a square before upload.</p>
              </div>
              <button type="button" (click)="closeProfilePhotoModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>

            <div class="space-y-4">
              <div class="flex justify-center">
                <div class="w-48 h-48 rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  @if (profilePhotoProcessing) {
                    <div class="text-center text-sm text-gray-500 dark:text-gray-400">
                      <div class="w-8 h-8 mx-auto mb-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Preparing preview…
                    </div>
                  } @else if (profilePhotoPreview) {
                    <img [src]="profilePhotoPreview" alt="Profile preview" class="w-full h-full object-cover" />
                  } @else {
                    <div class="text-center text-sm text-gray-500 dark:text-gray-400">No preview available</div>
                  }
                </div>
              </div>

              @if (profilePhotoError) {
                <p class="text-sm text-red-500">{{ profilePhotoError }}</p>
              }

              @if (profilePhotoUploading) {
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Uploading…</span>
                    <span>{{ profilePhotoUploadProgress }}%</span>
                  </div>
                  <div class="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div class="h-full bg-blue-600 transition-all duration-200" [style.width.%]="profilePhotoUploadProgress"></div>
                  </div>
                </div>
              }

              <div class="flex flex-wrap items-center gap-3">
                <button type="button"
                  (click)="avatarInput.click()"
                  [disabled]="profilePhotoProcessing || profilePhotoUploading"
                  class="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50">
                  Choose another photo
                </button>
                <button type="button"
                  (click)="uploadProfilePhoto()"
                  [disabled]="!profilePhotoFile || profilePhotoProcessing || profilePhotoUploading"
                  class="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50">
                  {{ profilePhotoUploading ? 'Uploading…' : 'Save photo' }}
                </button>
              </div>

              <p class="text-xs text-gray-500 dark:text-gray-400">Tip: use a clear square image. The saved avatar will appear across the app after upload.</p>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ChatPageComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;
  user: any = null;
  rooms: Room[] = [];
  selectedRoom: Room | null = null;
  messages: Message[] = [];
  newMessage = '';
  newRoomName = '';
  newRoomType = 'GROUP';
  showCreateRoom = false;
  creatingRoom = false;
  loadingMessages = false;
  editingMessage: Message | null = null;
  searchKeyword = '';
  pollingInterval: any = null;
  private shouldScrollToBottom = false;

  // Typing indicator state
  private typingTimeout: any = null;
  private isTypingSent = false;
  typingUsers: Set<string> = new Set();

  // STOMP subscription reference
  private stompSub: any = null;
  typingNameCache: Map<string,string> = new Map();

  currentStatus: string = 'ONLINE';
  presenceDotClass: string = 'bg-green-500';

  profilePhotoModalOpen = false;
  profilePhotoPreview: string | null = null;
  profilePhotoFile: File | null = null;
  profilePhotoProcessing = false;
  profilePhotoUploading = false;
  profilePhotoUploadProgress = 0;
  profilePhotoError = '';

  pendingFile: File | null = null;
  pendingFilePreview: string | null = null;
  uploading = false;
  uploadProgress = 0;
  uploadingFileName = '';
  showEmojiPicker = false;
  emojiList: string[] = ['😊','😂','👍','❤️','🎉','😮','😢','😡','🙌','🙏','😅','😎','🤔','👏','💯'];
  // Settings / member management
  showSettings = false;
  newMemberId = '';
  addingMember = false;

  constructor(
    private authService: AuthService,
    private roomService: RoomService,
    private messageService: MessageService,
    public mediaService: MediaService,
    private router: Router,
    public themeService: ThemeService,
    private notificationService: NotificationService,
    private presenceService: PresenceService
    ,private stompService: StompService
    ,private webService: WebService
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.loadRooms();
    if (this.user) {
      this.refreshUserProfile();
      this.presenceService.goOnline(this.user.userId).subscribe({
        next: () => this.updatePresenceDot('ONLINE'),
        error: (err) => console.warn('[Presence] goOnline failed', err)
      });
      this.notificationService.refreshUnreadCount(this.user.userId);
      // Connect STOMP for real-time features (JWT from AuthService)
      const token = this.authService.getToken();
      if (token) {
        this.stompService.connect(token, this.user.userId);
        this.stompSub = this.stompService.roomEvents$.subscribe((ev: OutboundEvent) => this.handleStompEvent(ev));
      }
    }
    window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    if (this.pendingFilePreview) URL.revokeObjectURL(this.pendingFilePreview);
    this.clearProfilePhotoPreview();
    window.removeEventListener('beforeunload', this.onBeforeUnload.bind(this));
    try { this.stompService.disconnect(); } catch {}
    if (this.stompSub) this.stompSub.unsubscribe();
  }

  onStatusChange(event: Event): void {
    const status = (event.target as HTMLSelectElement).value as any;
    if (!this.user) return;
    this.presenceService.updateStatus(this.user.userId, status).subscribe({
      next: () => { this.currentStatus = status; this.updatePresenceDot(status); },
      error: (err) => console.warn('[Presence] updateStatus failed', err)
    });
  }

  private updatePresenceDot(status: string): void {
    const map: Record<string, string> = { ONLINE: 'bg-green-500', AWAY: 'bg-yellow-400', DND: 'bg-red-500', INVISIBLE: 'bg-gray-400' };
    this.currentStatus = status;
    this.presenceDotClass = map[status] ?? 'bg-gray-400';
  }

  private onBeforeUnload(): void {
    if (this.user) { this.presenceService.disconnectSession().subscribe(); }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // Align client-side limit with platform: 25 MB
    if (file.size > 25 * 1024 * 1024) {
      alert('File too large. Maximum allowed size is 25 MB.');
      input.value = '';
      return;
    }
    this.pendingFile = file;
    if (file.type.startsWith('image/')) { this.pendingFilePreview = URL.createObjectURL(file); } else { this.pendingFilePreview = null; }
    input.value = '';
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.profilePhotoError = 'Please choose an image file.';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.profilePhotoError = 'Profile photo must be 10 MB or smaller.';
      return;
    }

    this.profilePhotoError = '';
    this.profilePhotoProcessing = true;

    this.cropAvatarFile(file)
      .then((croppedFile) => {
        this.clearProfilePhotoPreview();
        this.profilePhotoFile = croppedFile;
        this.profilePhotoPreview = URL.createObjectURL(croppedFile);
        this.profilePhotoModalOpen = true;
      })
      .catch((err) => {
        console.warn('[ProfilePhoto] crop failed, using original file', err);
        this.clearProfilePhotoPreview();
        this.profilePhotoFile = file;
        this.profilePhotoPreview = URL.createObjectURL(file);
        this.profilePhotoModalOpen = true;
      })
      .finally(() => {
        this.profilePhotoProcessing = false;
      });
  }

  uploadProfilePhoto(): void {
    if (!this.user || !this.profilePhotoFile || this.profilePhotoUploading) return;

    this.profilePhotoUploading = true;
    this.profilePhotoUploadProgress = 0;
    this.profilePhotoError = '';

    this.mediaService.uploadImageWithProgress(this.profilePhotoFile, this.user.userId).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.profilePhotoUploadProgress = Math.round((100 * event.loaded) / event.total);
          return;
        }

        if (event.type === HttpEventType.Response) {
          const uploadResp = event.body;
          const avatarUrl = uploadResp?.url || uploadResp?.thumbnailUrl;

          if (!avatarUrl) {
            this.profilePhotoUploading = false;
            this.profilePhotoUploadProgress = 0;
            this.profilePhotoError = 'Upload completed, but no avatar URL was returned.';
            return;
          }

          this.webService.updateProfile(this.user.userId, { avatarUrl }).subscribe({
            next: (profile) => {
              const updatedUser = {
                ...this.user,
                ...(profile || {}),
                avatarUrl: profile?.avatarUrl || avatarUrl,
              };
              this.user = updatedUser;
              this.authService.updateCurrentUser(updatedUser);
              this.closeProfilePhotoModal();
            },
            error: (err) => {
              console.warn('[ProfilePhoto] profile save failed', err);
              this.profilePhotoUploading = false;
              this.profilePhotoUploadProgress = 0;
              this.profilePhotoError = 'Photo uploaded, but saving the profile failed. Please try again.';
            }
          });
        }
      },
      error: (err) => {
        console.warn('[ProfilePhoto] upload failed', err);
        this.profilePhotoUploading = false;
        this.profilePhotoUploadProgress = 0;
        this.profilePhotoError = 'Upload failed. Please try again.';
      }
    });
  }

  closeProfilePhotoModal(): void {
    this.profilePhotoModalOpen = false;
    this.profilePhotoUploading = false;
    this.profilePhotoUploadProgress = 0;
    this.profilePhotoError = '';
    this.clearProfilePhotoPreview();
  }

  clearPendingFile(): void {
    if (this.pendingFilePreview) { URL.revokeObjectURL(this.pendingFilePreview); this.pendingFilePreview = null; }
    this.pendingFile = null;
  }

  loadRooms(): void {
    if (!this.user) return;
    this.roomService.getRoomsByUser(this.user.userId).subscribe({ next: (rooms) => this.rooms = rooms, error: () => console.error('Failed to load rooms') });
  }

  selectRoom(room: Room): void {
    this.selectedRoom = room;
    this.messages = [];
    this.editingMessage = null;
    this.searchKeyword = '';
    this.clearPendingFile();
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.loadMessages(room.roomId);
    this.pollingInterval = setInterval(() => {
      this.loadMessages(room.roomId);
      if (this.user) { this.notificationService.refreshUnreadCount(this.user.userId); }
    }, 3000);
    // Subscribe to STOMP room topic for live updates
    if (this.stompService.isConnected) {
      this.stompService.subscribeToRoom(room.roomId);
    }
  }

  handleCreateRoom(): void {
    if (!this.newRoomName.trim() || !this.user) return;
    this.creatingRoom = true;
    this.roomService.createRoom({ name: this.newRoomName.trim(), type: this.newRoomType, createdById: this.user.userId }).subscribe({
      next: (room) => { this.rooms.push(room); this.newRoomName = ''; this.newRoomType = 'GROUP'; this.showCreateRoom = false; this.creatingRoom = false; this.selectRoom(room); },
      error: () => { this.creatingRoom = false; }
    });
  }

  loadMessages(roomId: string): void {
    this.messageService.getMessagesByRoom(roomId).subscribe({
      next: (paged) => { this.messages = paged.content.reverse(); this.loadingMessages = false; this.shouldScrollToBottom = true; },
      error: () => { this.loadingMessages = false; }
    });
  }

  handleSend(): void {
    if ((!this.newMessage.trim() && !this.pendingFile) || !this.selectedRoom || !this.user) return;
    if (this.editingMessage) {
      this.messageService.editMessage(this.editingMessage.messageId, this.newMessage.trim()).subscribe({ next: (updated) => { const idx = this.messages.findIndex(m => m.messageId === updated.messageId); if (idx !== -1) this.messages[idx] = updated; this.cancelEdit(); } });
      return;
    }

    if (this.pendingFile) {
      this.uploading = true; this.uploadProgress = 0; this.uploadingFileName = this.pendingFile.name; const caption = this.newMessage.trim(); const msgType = this.mediaService.getMessageType(this.pendingFile);
      const upload$ = msgType === 'IMAGE' ? this.mediaService.uploadImageWithProgress(this.pendingFile, this.user.userId, { roomId: this.selectedRoom.roomId }) : this.mediaService.uploadFileWithProgress(this.pendingFile, this.user.userId, { roomId: this.selectedRoom.roomId });
      upload$.subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) { this.uploadProgress = Math.round((100 * event.loaded) / event.total); }
          else if (event.type === HttpEventType.Response) {
            const uploadResp = event.body!;
            this.messageService.sendMessage({ roomId: this.selectedRoom!.roomId, senderId: this.user.userId, content: caption || uploadResp.filename, type: msgType, mediaUrl: uploadResp.url }).subscribe({
              next: (msg) => { this.messages.push(msg); this.newMessage = ''; this.uploading = false; this.uploadProgress = 0; this.clearPendingFile(); this.shouldScrollToBottom = true; },
              error: () => { this.uploading = false; this.uploadProgress = 0; }
            });
          }
        },
        error: () => { this.uploading = false; this.uploadProgress = 0; alert('Upload failed. Please try again.'); }
      });
      return;
    }

    this.messageService.sendMessage({ roomId: this.selectedRoom.roomId, senderId: this.user.userId, content: this.newMessage.trim(), type: 'TEXT' }).subscribe({ next: (msg) => { this.messages.push(msg); this.newMessage = ''; this.shouldScrollToBottom = true; } });
  }

  // Called on every key press in the input to send a typing indicator with 3s debounce
  onInputKeyup(): void {
    if (!this.user || !this.selectedRoom) return;

    if (!this.isTypingSent) {
      this.stompService.sendTypingIndicator(this.user.userId, this.selectedRoom.roomId, true);
      this.isTypingSent = true;
    }

    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.stompService.sendTypingIndicator(this.user.userId, this.selectedRoom!.roomId, false);
      this.isTypingSent = false;
      this.typingTimeout = null;
    }, 3000);
  }

  private handleStompEvent(ev: OutboundEvent): void {
    if (!ev) return;
    switch (ev.type) {
      case 'CHAT_MESSAGE':
        if (this.selectedRoom && ev.roomId === this.selectedRoom.roomId) {
          this.messages.push({
            messageId: ev.messageId || crypto.randomUUID(),
            roomId: ev.roomId || '',
            senderId: ev.senderId || '',
            content: ev.content || '',
            type: (ev.messageType as any) || 'TEXT',
            mediaUrl: ev.mediaUrl,
            isEdited: !!ev.isEdited,
            isDeleted: !!ev.isDeleted,
            deliveryStatus: (ev.deliveryStatus as any) || 'DELIVERED',
            sentAt: ev.timestamp || new Date().toISOString()
          } as Message);
          this.shouldScrollToBottom = true;
        }
        break;
      case 'MESSAGE_EDIT':
        if (!ev.messageId) break;
        const idx = this.messages.findIndex(m => m.messageId === ev.messageId);
        if (idx !== -1) {
          this.messages[idx].content = ev.newContent || this.messages[idx].content;
          this.messages[idx].isEdited = true;
        }
        break;
      case 'MESSAGE_DELETE':
        if (!ev.messageId) break;
        const idx2 = this.messages.findIndex(m => m.messageId === ev.messageId);
        if (idx2 !== -1) {
          this.messages[idx2].isDeleted = true;
          this.messages[idx2].content = '[Message deleted]';
        }
        break;
      case 'TYPING_INDICATOR':
        if (!ev.userId || !ev.roomId) break;
        if (this.selectedRoom && ev.roomId === this.selectedRoom.roomId) {
          if (ev.isTyping) {
            this.typingUsers.add(ev.userId);
            // resolve username for nicer UX
            if (!this.typingNameCache.has(ev.userId)) {
              const uid = ev.userId; // capture to avoid undefined in callback
              this.webService.getProfile(uid).subscribe({ next: (p) => { if (p?.username) this.typingNameCache.set(uid, p.username); }, error: () => {} });
            }
          } else {
            this.typingUsers.delete(ev.userId);
          }
        }
        break;
      case 'PRESENCE_UPDATE':
        if (ev.userId && this.user && ev.userId === this.user.userId) {
          this.updatePresenceDot(ev.status || 'ONLINE');
        }
        break;
      case 'READ_RECEIPT':
        // Mark message(s) as read/delivered based on event payload
        if (ev.deliveryStatus && ev.messageId) {
          const midx = this.messages.findIndex(m => m.messageId === ev.messageId);
          if (midx !== -1) this.messages[midx].deliveryStatus = ev.deliveryStatus as any;
        } else if (ev.upToMessageId) {
          const idxUp = this.messages.findIndex(m => m.messageId === ev.upToMessageId);
          if (idxUp !== -1) {
            // Mark that message as READ and earlier messages from same sender
            for (let i = 0; i <= idxUp; i++) {
              if (this.messages[i].senderId === this.user?.userId) this.messages[i].deliveryStatus = 'READ';
            }
          }
        }
        break;
    }
  }

  handleDeleteMessage(messageId: string): void {
    this.messageService.deleteMessage(messageId).subscribe({ next: () => { const msg = this.messages.find(m => m.messageId === messageId); if (msg) { msg.isDeleted = true; msg.content = '[Message deleted]'; } } });
  }

  startEdit(msg: Message): void { this.editingMessage = msg; this.newMessage = msg.content; }
  cancelEdit(): void { this.editingMessage = null; this.newMessage = ''; }

  // UI actions referenced from the template
  handleLogout(): void {
    if (this.user) {
      // Disconnect STOMP then set offline then logout
      try { this.stompService.disconnect(); } catch {}
      this.presenceService.goOffline(this.user.userId).subscribe({ complete: () => this.authService.logout() });
    } else {
      try { this.stompService.disconnect(); } catch {}
      this.authService.logout();
    }
  }

  searchMessages(): void {
    if (!this.searchKeyword.trim() || !this.selectedRoom) {
      this.loadMessages(this.selectedRoom?.roomId ?? '');
      return;
    }
    // Simple client-side search: filter current messages by keyword
    const kw = this.searchKeyword.trim().toLowerCase();
    this.messages = this.messages.filter(m => (m.content || '').toLowerCase().includes(kw));
  }

  clearSearch(): void {
    this.searchKeyword = '';
    if (this.selectedRoom) this.loadMessages(this.selectedRoom.roomId);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  insertEmoji(emoji: string): void {
    this.newMessage = (this.newMessage || '') + emoji;
    this.showEmojiPicker = false;
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  isRoomOwner(): boolean {
    return !!(this.user && this.selectedRoom && this.user.userId === this.selectedRoom.createdById);
  }

  addMemberById(): void {
    if (!this.selectedRoom || !this.newMemberId.trim()) return;
    this.addingMember = true;
    this.roomService.addMember(this.selectedRoom.roomId, { userId: this.newMemberId.trim() }).subscribe({
      next: (member) => {
        if (this.selectedRoom) this.selectedRoom.memberCount = (this.selectedRoom.memberCount || 0) + 1;
        this.newMemberId = '';
        this.showSettings = false;
        this.addingMember = false;
      },
      error: (err) => {
        console.error('Failed to add member', err);
        alert('Failed to add member.');
        this.addingMember = false;
      }
    });
  }

  // helpers
  private scrollToBottom(): void { try { this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' }); } catch {} }
  openMediaInNewTab(url: string): void { window.open(url, '_blank'); }
  onImageError(event: Event): void { (event.target as HTMLImageElement).src = '/assets/image-broken.png'; }
  extractFileName(url: string): string { try { return decodeURIComponent(url.split('/').pop() || 'file'); } catch { return 'file'; } }
  formatTime(iso?: string): string { if (!iso) return ''; const d = new Date(iso); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  private refreshUserProfile(): void {
    if (!this.user) return;

    this.webService.getProfile(this.user.userId).subscribe({
      next: (profile) => {
        if (!profile) return;

        const mergedUser = {
          ...this.user,
          ...profile,
          avatarUrl: profile.avatarUrl || profile.profileImageUrl || this.user.avatarUrl,
        };

        this.user = mergedUser;
        this.authService.updateCurrentUser(mergedUser);
      },
      error: () => {}
    });
  }

  private clearProfilePhotoPreview(): void {
    if (this.profilePhotoPreview) {
      URL.revokeObjectURL(this.profilePhotoPreview);
      this.profilePhotoPreview = null;
    }
    this.profilePhotoFile = null;
  }

  private async cropAvatarFile(file: File): Promise<File> {
    const image = await this.loadImage(file);
    const squareSize = Math.min(image.width, image.height);
    const offsetX = Math.floor((image.width - squareSize) / 2);
    const offsetY = Math.floor((image.height - squareSize) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = squareSize;
    canvas.height = squareSize;

    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(image, offsetX, offsetY, squareSize, squareSize, 0, 0, squareSize, squareSize);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });

    if (!blob) {
      return file;
    }

    return new File([blob], this.normalizeAvatarFileName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to load image.'));
      };

      image.src = objectUrl;
    });
  }

  private normalizeAvatarFileName(name: string): string {
    const baseName = name.replace(/\.[^.]+$/, '') || 'avatar';
    return `${baseName}-avatar.jpg`;
  }
}
