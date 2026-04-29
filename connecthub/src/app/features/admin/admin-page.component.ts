/**
 * GAP 7 — admin-page.component.ts
 * Platform Admin Panel — standalone Angular component.
 *
 * Tabs: Users | Rooms | Analytics | Connections | Broadcast | Audit Logs
 *
 * All data is fetched from the existing WebService admin methods that were
 * already implemented (confirmed in gap analysis):
 *   getAdminDashboard(), getAllUsers(), suspendUser(), reactivateUser(),
 *   deleteUser(), getAllRoomsAdmin(), deleteRoomAdmin(),
 *   getActiveConnections(), getPlatformAnalytics(),
 *   sendBroadcastNotification(), getAuditLogs()
 *
 * File: src/app/features/admin/admin-page.component.ts
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WebService } from '../../core/services/web.service';
import { AuthService } from '../../core/services/auth.service';

type AdminTab = 'users' | 'rooms' | 'analytics' | 'connections' | 'broadcast' | 'audit';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <!-- ═══════════════════════════════════════════════════════════════════
         ConnectHub — Platform Admin Panel
         ═══════════════════════════════════════════════════════════════════ -->
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">

      <!-- ── Top Nav ────────────────────────────────────────────────────── -->
      <header class="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">ConnectHub</span>
          <span class="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300
                       text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ currentUser?.username }}
          </span>
          <a routerLink="/chat"
             class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
            ← Back to Chat
          </a>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 py-6">

        <!-- ── Dashboard Summary Cards ──────────────────────────────────── -->
        <div *ngIf="dashboard" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div *ngFor="let card of summaryCards()"
               class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {{ card.label }}
            </p>
            <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {{ card.value }}
            </p>
          </div>
        </div>
        <div *ngIf="!dashboard && dashboardLoading"
             class="text-sm text-gray-400 mb-4">Loading dashboard…</div>

        <!-- ── Tab Bar ───────────────────────────────────────────────────── -->
        <div class="flex gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm mb-6 overflow-x-auto">
          <button *ngFor="let tab of tabs"
                  (click)="selectTab(tab.key)"
                  [class.bg-indigo-600]="activeTab === tab.key"
                  [class.text-white]="activeTab === tab.key"
                  [class.text-gray-600]="activeTab !== tab.key"
                  [class.dark:text-gray-300]="activeTab !== tab.key"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         transition-colors whitespace-nowrap">
            <span>{{ tab.icon }}</span>{{ tab.label }}
          </button>
        </div>

        <!-- ════════════════════════════════════════════════════════════════
             TAB: USERS
             ════════════════════════════════════════════════════════════════ -->
        <div *ngIf="activeTab === 'users'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">User Management</h2>
            <button (click)="loadUsers()"
                    class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              ↺ Refresh
            </button>
          </div>

          <!-- Loading / error -->
          <p *ngIf="usersLoading" class="text-sm text-gray-400">Loading users…</p>
          <p *ngIf="usersError" class="text-sm text-red-500">{{ usersError }}</p>

          <!-- Table -->
          <div *ngIf="!usersLoading && users.length" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th class="text-left px-4 py-3">User</th>
                  <th class="text-left px-4 py-3">Email</th>
                  <th class="text-left px-4 py-3">Role</th>
                  <th class="text-left px-4 py-3">Status</th>
                  <th class="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr *ngFor="let u of users"
                    class="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td class="px-4 py-3 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center
                                text-white text-xs font-bold shrink-0">
                      {{ (u.username || u.fullName || '?')[0].toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-medium text-gray-900 dark:text-gray-100">{{ u.fullName || u.username }}</p>
                      <p class="text-xs text-gray-400">@{{ u.username }}</p>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ u.email }}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="{
                            'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300': u.role === 'PLATFORM_ADMIN',
                            'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300': u.role === 'ROOM_ADMIN',
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300': u.role === 'USER'
                          }">
                      {{ u.role }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="{
                            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300': u.isActive,
                            'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300': !u.isActive
                          }">
                      {{ u.isActive ? 'Active' : 'Suspended' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <button *ngIf="u.isActive"
                              (click)="suspendUser(u)"
                              class="text-xs text-amber-600 hover:text-amber-700 font-medium">
                        Suspend
                      </button>
                      <button *ngIf="!u.isActive"
                              (click)="reactivateUser(u)"
                              class="text-xs text-green-600 hover:text-green-700 font-medium">
                        Reactivate
                      </button>
                      <button (click)="confirmDeleteUser(u)"
                              class="text-xs text-red-500 hover:text-red-600 font-medium">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p *ngIf="!usersLoading && !users.length && !usersError"
             class="text-sm text-gray-400">No users found.</p>
        </div>

        <!-- ════════════════════════════════════════════════════════════════
             TAB: ROOMS
             ════════════════════════════════════════════════════════════════ -->
        <div *ngIf="activeTab === 'rooms'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Room Management</h2>
            <button (click)="loadRooms()"
                    class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              ↺ Refresh
            </button>
          </div>

          <p *ngIf="roomsLoading" class="text-sm text-gray-400">Loading rooms…</p>
          <p *ngIf="roomsError" class="text-sm text-red-500">{{ roomsError }}</p>

          <div *ngIf="!roomsLoading && rooms.length"
               class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th class="text-left px-4 py-3">Room</th>
                  <th class="text-left px-4 py-3">Type</th>
                  <th class="text-left px-4 py-3">Members</th>
                  <th class="text-left px-4 py-3">Last Active</th>
                  <th class="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr *ngFor="let r of rooms"
                    class="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-900 dark:text-gray-100">{{ r.name }}</p>
                    <p class="text-xs text-gray-400">{{ r.roomId }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="{
                            'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300': r.type === 'GROUP',
                            'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300': r.type === 'DM'
                          }">
                      {{ r.type }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ r.memberCount ?? '—' }}</td>
                  <td class="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {{ r.lastMessageAt ? (r.lastMessageAt | date:'short') : '—' }}
                  </td>
                  <td class="px-4 py-3">
                    <button (click)="confirmDeleteRoom(r)"
                            class="text-xs text-red-500 hover:text-red-600 font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p *ngIf="!roomsLoading && !rooms.length && !roomsError"
             class="text-sm text-gray-400">No rooms found.</p>
        </div>

        <!-- ════════════════════════════════════════════════════════════════
             TAB: ANALYTICS
             ════════════════════════════════════════════════════════════════ -->
        <div *ngIf="activeTab === 'analytics'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Platform Analytics</h2>
            <button (click)="loadAnalytics()"
                    class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              ↺ Refresh
            </button>
          </div>

          <p *ngIf="analyticsLoading" class="text-sm text-gray-400">Loading analytics…</p>
          <p *ngIf="analyticsError" class="text-sm text-red-500">{{ analyticsError }}</p>

          <div *ngIf="analytics && !analyticsLoading"
               class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Metric cards rendered dynamically from whatever the API returns -->
            <div *ngFor="let metric of analyticsMetrics()"
                 class="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {{ metric.label }}
              </p>
              <p class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {{ metric.value }}
              </p>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════
             TAB: CONNECTIONS (live WebSocket count)
             ════════════════════════════════════════════════════════════════ -->
        <div *ngIf="activeTab === 'connections'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Active WebSocket Connections</h2>
            <button (click)="loadConnections()"
                    class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              ↺ Refresh
            </button>
          </div>

          <p *ngIf="connectionsLoading" class="text-sm text-gray-400">Loading connections…</p>
          <p *ngIf="connectionsError" class="text-sm text-red-500">{{ connectionsError }}</p>

          <div *ngIf="connections && !connectionsLoading"
               class="space-y-4">
            <!-- Big live counter -->
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div class="w-4 h-4 rounded-full bg-green-400 animate-pulse"></div>
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Live connections</p>
                <p class="text-4xl font-bold text-green-500">
                  {{ connections.activeCount ?? connections.count ?? connections.total ?? '—' }}
                </p>
              </div>
            </div>

            <!-- Session list (if returned by the API) -->
              <div *ngIf="connectionSessions.length"
                 class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-sm font-medium">
                Active Sessions
              </div>
              <div class="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
                <div *ngFor="let s of connectionSessions"
                     class="px-4 py-3 text-sm flex items-center justify-between">
                  <div>
                    <span class="font-medium">{{ s.username ?? s.userId }}</span>
                    <span *ngIf="s.deviceType" class="ml-2 text-xs text-gray-400">{{ s.deviceType }}</span>
                  </div>
                  <span class="text-xs text-gray-400">
                    {{ s.connectedAt ? (s.connectedAt | date:'shortTime') : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════
             TAB: BROADCAST
             ════════════════════════════════════════════════════════════════ -->
        <div *ngIf="activeTab === 'broadcast'">
          <h2 class="text-lg font-semibold mb-4">Platform Broadcast</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Send a system-wide message to all currently connected users via STOMP.
          </p>

          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 max-w-xl">
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Title</label>
              <input [(ngModel)]="broadcastTitle"
                     placeholder="e.g. Scheduled maintenance at 11 PM UTC"
                     class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                            bg-white dark:bg-gray-700 text-sm focus:outline-none
                            focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Message</label>
              <textarea [(ngModel)]="broadcastMessage"
                        rows="4"
                        placeholder="Full message body…"
                        class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                               bg-white dark:bg-gray-700 text-sm resize-none focus:outline-none
                               focus:ring-2 focus:ring-indigo-400"></textarea>
            </div>
            <div class="flex items-center gap-3">
              <button (click)="sendBroadcast()"
                      [disabled]="broadcastSending || !broadcastTitle.trim() || !broadcastMessage.trim()"
                      class="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg
                             hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors">
                {{ broadcastSending ? 'Sending…' : '📢 Send Broadcast' }}
              </button>
              <span *ngIf="broadcastSuccess"
                    class="text-sm text-green-600 dark:text-green-400">
                ✓ Sent successfully
              </span>
              <span *ngIf="broadcastError"
                    class="text-sm text-red-500">
                {{ broadcastError }}
              </span>
            </div>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════════
             TAB: AUDIT LOGS
             ════════════════════════════════════════════════════════════════ -->
        <div *ngIf="activeTab === 'audit'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Audit Logs</h2>
            <button (click)="loadAuditLogs()"
                    class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              ↺ Refresh
            </button>
          </div>

          <p *ngIf="auditLoading" class="text-sm text-gray-400">Loading audit logs…</p>
          <p *ngIf="auditError" class="text-sm text-red-500">{{ auditError }}</p>

          <div *ngIf="!auditLoading && auditLogs.length"
               class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div class="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              <div *ngFor="let log of auditLogs"
                   class="px-5 py-3 flex items-start gap-4 text-sm
                          hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <!-- Icon by action type -->
                <span class="text-lg mt-0.5 shrink-0">
                  {{ auditIcon(log.action ?? log.actionType ?? '') }}
                </span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium text-gray-900 dark:text-gray-100">
                      {{ log.action ?? log.actionType ?? 'ACTION' }}
                    </span>
                    <span class="text-xs text-gray-400 shrink-0">
                      {{ log.timestamp ? (log.timestamp | date:'short') : '' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    Actor: <strong>{{ log.actorUsername ?? log.actorId }}</strong>
                    <span *ngIf="log.targetId"> · Target: {{ log.targetId }}</span>
                    <span *ngIf="log.details"> · {{ log.details }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p *ngIf="!auditLoading && !auditLogs.length && !auditError"
             class="text-sm text-gray-400">No audit logs found.</p>
        </div>

      </div><!-- /max-w-7xl -->
    </div>

    <!-- ── Confirm Delete Modal ──────────────────────────────────────────── -->
    <div *ngIf="confirmModal.show"
         class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 class="text-base font-semibold mb-2">{{ confirmModal.title }}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-5">{{ confirmModal.message }}</p>
        <div class="flex justify-end gap-3">
          <button (click)="confirmModal.show = false"
                  class="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </button>
          <button (click)="confirmModal.onConfirm()"
                  class="px-4 py-2 text-sm rounded-lg bg-red-600 text-white
                         hover:bg-red-700 transition-colors">
            {{ confirmModal.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class AdminPageComponent implements OnInit, OnDestroy {

  // ─── Tab configuration ────────────────────────────────────────────────────
  readonly tabs = [
    { key: 'users'       as AdminTab, label: 'Users',       icon: '👥' },
    { key: 'rooms'       as AdminTab, label: 'Rooms',       icon: '💬' },
    { key: 'analytics'   as AdminTab, label: 'Analytics',   icon: '📊' },
    { key: 'connections' as AdminTab, label: 'Connections', icon: '🔌' },
    { key: 'broadcast'   as AdminTab, label: 'Broadcast',   icon: '📢' },
    { key: 'audit'       as AdminTab, label: 'Audit Logs',  icon: '🗂️' },
  ];
  activeTab: AdminTab = 'users';

  // ─── Current user ─────────────────────────────────────────────────────────
  currentUser: any = null;

  // ─── Dashboard ───────────────────────────────────────────────────────────
  dashboard: any = null;
  dashboardLoading = false;

  // ─── Users ───────────────────────────────────────────────────────────────
  users: any[] = [];
  usersLoading = false;
  usersError = '';

  // ─── Rooms ───────────────────────────────────────────────────────────────
  rooms: any[] = [];
  roomsLoading = false;
  roomsError = '';

  // ─── Analytics ───────────────────────────────────────────────────────────
  analytics: any = null;
  analyticsLoading = false;
  analyticsError = '';

  // ─── Connections ─────────────────────────────────────────────────────────
  connections: any = null;
  connectionSessions: any[] = [];
  connectionsLoading = false;
  connectionsError = '';
  private connectionsInterval: any;

  // ─── Broadcast ───────────────────────────────────────────────────────────
  broadcastTitle = '';
  broadcastMessage = '';
  broadcastSending = false;
  broadcastSuccess = false;
  broadcastError = '';

  // ─── Audit Logs ──────────────────────────────────────────────────────────
  auditLogs: any[] = [];
  auditLoading = false;
  auditError = '';

  // ─── Confirm modal ────────────────────────────────────────────────────────
  confirmModal = {
    show: false,
    title: '',
    message: '',
    confirmLabel: 'Delete',
    onConfirm: () => {}
  };

  constructor(
    private webService: WebService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboard();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    if (this.connectionsInterval) clearInterval(this.connectionsInterval);
  }

  // ─── Tab selection ────────────────────────────────────────────────────────
  selectTab(tab: AdminTab): void {
    this.activeTab = tab;
    // Lazy-load data for each tab on first visit
    switch (tab) {
      case 'users':       if (!this.users.length)       this.loadUsers();        break;
      case 'rooms':       if (!this.rooms.length)       this.loadRooms();        break;
      case 'analytics':   if (!this.analytics)          this.loadAnalytics();    break;
      case 'connections':                                this.loadConnections();  break;
      case 'audit':       if (!this.auditLogs.length)   this.loadAuditLogs();    break;
    }
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────
  loadDashboard(): void {
    this.dashboardLoading = true;
    this.webService.getAdminDashboard().subscribe({
      next: data => { this.dashboard = data; this.dashboardLoading = false; },
      error: () => { this.dashboardLoading = false; }
    });
  }

  summaryCards(): { label: string; value: any }[] {
    if (!this.dashboard) return [];
    // Accept whatever shape the API returns, show first 4 numeric keys
    return Object.entries(this.dashboard)
      .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
      .slice(0, 4)
      .map(([k, v]) => ({
        label: k.replace(/([A-Z])/g, ' $1').trim(),
        value: v
      }));
  }

  // ─── Users ───────────────────────────────────────────────────────────────
  loadUsers(): void {
    this.usersLoading = true;
    this.usersError = '';
    this.webService.getAllUsers().subscribe({
      next: data => { this.users = data; this.usersLoading = false; },
      error: err => {
        this.usersError = err?.error?.message ?? 'Failed to load users.';
        this.usersLoading = false;
      }
    });
  }

  suspendUser(user: any): void {
    this.webService.suspendUser(user.userId).subscribe({
      next: () => { user.isActive = false; },
      error: () => {}
    });
  }

  reactivateUser(user: any): void {
    this.webService.reactivateUser(user.userId).subscribe({
      next: () => { user.isActive = true; },
      error: () => {}
    });
  }

  confirmDeleteUser(user: any): void {
    this.confirmModal = {
      show: true,
      title: 'Delete User',
      message: `Permanently delete @${user.username}? This cannot be undone.`,
      confirmLabel: 'Delete User',
      onConfirm: () => {
        this.webService.deleteUser(user.userId).subscribe({
          next: () => {
            this.users = this.users.filter(u => u.userId !== user.userId);
            this.confirmModal.show = false;
          },
          error: () => { this.confirmModal.show = false; }
        });
      }
    };
  }

  // ─── Rooms ───────────────────────────────────────────────────────────────
  loadRooms(): void {
    this.roomsLoading = true;
    this.roomsError = '';
    this.webService.getAllRoomsAdmin().subscribe({
      next: data => { this.rooms = data; this.roomsLoading = false; },
      error: err => {
        this.roomsError = err?.error?.message ?? 'Failed to load rooms.';
        this.roomsLoading = false;
      }
    });
  }

  confirmDeleteRoom(room: any): void {
    this.confirmModal = {
      show: true,
      title: 'Delete Room',
      message: `Permanently delete room "${room.name}"? All messages will be removed.`,
      confirmLabel: 'Delete Room',
      onConfirm: () => {
        this.webService.deleteRoomAdmin(room.roomId).subscribe({
          next: () => {
            this.rooms = this.rooms.filter(r => r.roomId !== room.roomId);
            this.confirmModal.show = false;
          },
          error: () => { this.confirmModal.show = false; }
        });
      }
    };
  }

  // ─── Analytics ───────────────────────────────────────────────────────────
  loadAnalytics(): void {
    this.analyticsLoading = true;
    this.analyticsError = '';
    this.webService.getPlatformAnalytics().subscribe({
      next: data => { this.analytics = data; this.analyticsLoading = false; },
      error: err => {
        this.analyticsError = err?.error?.message ?? 'Failed to load analytics.';
        this.analyticsLoading = false;
      }
    });
  }

  analyticsMetrics(): { label: string; value: any }[] {
    if (!this.analytics) return [];
    return Object.entries(this.analytics)
      .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
      .map(([k, v]) => ({
        label: k.replace(/([A-Z])/g, ' $1').trim(),
        value: v
      }));
  }

  // ─── Connections ─────────────────────────────────────────────────────────
  loadConnections(): void {
    this.connectionsLoading = true;
    this.connectionsError = '';
    this.webService.getActiveConnections().subscribe({
      next: data => {
        this.connections = data;
        // Support both { sessions: [...] } and flat array responses
        this.connectionSessions = Array.isArray(data?.sessions)
          ? data.sessions
          : Array.isArray(data) ? data : [];
        this.connectionsLoading = false;
      },
      error: err => {
        this.connectionsError = err?.error?.message ?? 'Failed to load connections.';
        this.connectionsLoading = false;
      }
    });
  }

  // ─── Broadcast ───────────────────────────────────────────────────────────
  sendBroadcast(): void {
    if (!this.broadcastTitle.trim() || !this.broadcastMessage.trim()) return;
    this.broadcastSending = true;
    this.broadcastSuccess = false;
    this.broadcastError = '';

    this.webService.sendBroadcastNotification({
      title: this.broadcastTitle.trim(),
      message: this.broadcastMessage.trim(),
      type: 'SYSTEM'
    }).subscribe({
      next: () => {
        this.broadcastSending = false;
        this.broadcastSuccess = true;
        this.broadcastTitle = '';
        this.broadcastMessage = '';
        setTimeout(() => { this.broadcastSuccess = false; }, 4000);
      },
      error: err => {
        this.broadcastSending = false;
        this.broadcastError = err?.error?.message ?? 'Failed to send broadcast.';
      }
    });
  }

  // ─── Audit Logs ──────────────────────────────────────────────────────────
  loadAuditLogs(): void {
    this.auditLoading = true;
    this.auditError = '';
    this.webService.getAuditLogs().subscribe({
      next: data => {
        // Support { logs: [...] } or flat array
        this.auditLogs = Array.isArray(data) ? data : (data?.logs ?? data?.content ?? []);
        this.auditLoading = false;
      },
      error: err => {
        this.auditError = err?.error?.message ?? 'Failed to load audit logs.';
        this.auditLoading = false;
      }
    });
  }

  /** Pick an emoji icon based on the admin action string. */
  auditIcon(action: string): string {
    const a = action.toLowerCase();
    if (a.includes('delete'))   return '🗑️';
    if (a.includes('suspend'))  return '🚫';
    if (a.includes('reactivat')) return '✅';
    if (a.includes('broadcast')) return '📢';
    if (a.includes('pin'))      return '📌';
    if (a.includes('mute'))     return '🔇';
    if (a.includes('clear'))    return '🧹';
    if (a.includes('role'))     return '🔑';
    return '📋';
  }
}
