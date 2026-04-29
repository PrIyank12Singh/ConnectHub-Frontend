import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PresenceResponse, PresenceService } from '../../../../core/services/presence.service';
import { Subscription } from 'rxjs';

/**
 * Reusable online status dot + label.
 *
 * Usage:
 *   <app-presence-indicator [userId]="member.userId" />
 *   <app-presence-indicator [userId]="member.userId" [showLabel]="true" />
 */
@Component({
  selector: 'app-presence-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center gap-1.5">
      <!-- Coloured dot -->
      <span
        class="inline-block w-2.5 h-2.5 rounded-full border border-white shadow-sm"
        [ngClass]="dotClass"
        [title]="label"
      ></span>

      <!-- Optional text label -->
      <span *ngIf="showLabel" class="text-xs text-gray-500">{{ label }}</span>
    </span>
  `,
})
export class PresenceIndicatorComponent implements OnInit, OnDestroy {
  @Input() userId!: string;
  @Input() showLabel = false;

  dotClass = 'bg-gray-400';
  label = 'Offline';

  private sub?: Subscription;

  constructor(private presenceService: PresenceService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private load(): void {
    this.sub = this.presenceService.getPresence(this.userId).subscribe({
      next: (p: PresenceResponse) => {
        this.dotClass = this.presenceService.statusColor(p.status);
        this.label = this.presenceService.statusLabel(p.status);
      },
      error: () => {
        // User has no active session - show offline
        this.dotClass = 'bg-gray-400';
        this.label = 'Offline';
      },
    });
  }
}
