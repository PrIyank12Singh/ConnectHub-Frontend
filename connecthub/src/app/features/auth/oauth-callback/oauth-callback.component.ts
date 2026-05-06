import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div class="text-center">
        <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Signing you in...</p>
      </div>
    </div>
  `
})
export class OAuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token    = params['token'];
      const userId   = params['userId'];
      const username = params['username'];
      const email    = params['email'];
      const role     = params['role'];

      if (token) {
        localStorage.setItem('connecthub_token', token);

        const user = { userId, username, email, role };

        // ✅ This was missing — updates the in-memory BehaviorSubject
        // so guards can read the role immediately without a page refresh
        this.authService.setCurrentUser(user);

        // Send admins directly to the admin panel
        if (role === 'PLATFORM_ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/chat']);
        }
      } else {
        this.router.navigate(['/login']);
      }
    });
  }
}