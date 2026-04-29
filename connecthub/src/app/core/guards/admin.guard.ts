import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * GAP 7 — admin.guard.ts
 * Restricts access to the /admin route to users whose role is PLATFORM_ADMIN.
 * Any other authenticated user is redirected to /chat.
 * Unauthenticated users are redirected to /login.
 *
 * File: src/app/core/guards/admin.guard.ts
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.role === 'PLATFORM_ADMIN') {
    return true;
  }

  // Authenticated but not an admin — send them back to chat
  router.navigate(['/chat']);
  return false;
};
