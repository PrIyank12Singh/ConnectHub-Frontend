import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NotificationService,
  NotificationResponse,
} from '../../../../core/services/notification.service';
import { Subscription } from 'rxjs';

/**
 * Reusable notification bell icon with unread badge and dropdown list.
 *
 * Usage (in your chat navbar):
 *   <app-notification-bell [userId]="currentUser.userId" />
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">

      <!-- Bell Button -->
      <button
        (click)="toggleDropdown()"
        class="relative p-2 rounded-full hover:bg-gray-100 transition"
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600"
             fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6
                   6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6
                   0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        <!-- Unread Badge -->
        <span
          *ngIf="unreadCount > 0"
          class="absolute top-0 right-0 inline-flex items-center justify-center
                 px-1.5 py-0.5 text-xs font-bold leading-none text-white
                 bg-red-500 rounded-full min-w-[18px]"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>

      <!-- Dropdown Panel -->
      <div
        *ngIf="isOpen"
        class="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl
               border border-gray-100 z-50 overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 class="font-semibold text-gray-800 text-sm">Notifications</h3>
          <button
            *ngIf="unreadCount > 0"
            (click)="markAllRead()"
            class="text-xs text-blue-500 hover:text-blue-700"
          >
            Mark all read
          </button>
        </div>

        <!-- List -->
        <div class="max-h-80 overflow-y-auto divide-y divide-gray-50">
          <div *ngIf="notifications.length === 0"
               class="px-4 py-8 text-center text-sm text-gray-400">
            No notifications yet
          </div>

          <div
            *ngFor="let n of notifications"
            (click)="markAsRead(n)"
            class="flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition"
            [class.bg-blue-50]="!n.isRead"
          >
            <!-- Icon -->
            <span class="text-xl mt-0.5">{{ typeIcon(n.type) }}</span>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ n.title }}</p>
              <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">{{ n.message }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ n.createdAt | date:'shortTime' }}</p>
            </div>

            <!-- Unread dot -->
            <span *ngIf="!n.isRead"
                  class="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0">
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-2 border-t border-gray-100 text-center">
          <button
            (click)="isOpen = false"
            class="text-xs text-gray-400 hover:text-gray-600"
          >
            Close
          </button>
        </div>
      </div>

    </div>
  `,
})
export class NotificationBellComponent implements OnInit, OnDestroy {

  @Input() userId!: string;

  notifications: NotificationResponse[] = [];
  unreadCount = 0;
  isOpen = false;

  private subs: Subscription[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();

    // Subscribe to live unread count changes (updated when markAsRead is called)
    this.subs.push(
      this.notificationService.unreadCount$.subscribe(
        (count: number) => (this.unreadCount = count)
      )
    );

    // Initial badge count
    this.notificationService.refreshUnreadCount(this.userId);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getByRecipient(this.userId).subscribe({
      next: (data: NotificationResponse[]) => (this.notifications = data),
      error: (err: unknown) => console.error('[NotificationBell] load failed', err),
    });
  }

  markAsRead(n: NotificationResponse): void {
    if (!n.isRead) {
      this.notificationService.markAsRead(n.notificationId).subscribe({
        next: () => (n.isRead = true),
      });
    }
  }

  markAllRead(): void {
    this.notificationService.markAllRead(this.userId).subscribe({
      next: () => this.notifications.forEach(n => (n.isRead = true)),
    });
  }

  typeIcon(type: string): string {
    return this.notificationService.typeIcon(type as any);
  }
}
