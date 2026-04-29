import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">

      <button type="button" (click)="themeService.toggle()"
        class="fixed top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
        {{ (themeService.isDark$ | async) ? '☀️' : '🌙' }}
      </button>

      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="flex justify-center mb-3">
            <div class="bg-blue-600 p-3 rounded-2xl text-white text-2xl">💬</div>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">ConnectHub</h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">Connect Instantly. Chat Securely.</p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 class="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Sign in</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" [(ngModel)]="email"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input type="password" [(ngModel)]="password"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••" />
            </div>

            @if (error) {
              <p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{{ error }}</p>
            }

            <button type="button" (click)="handleLogin()" [disabled]="loading"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer">
              {{ loading ? 'Signing in...' : 'Sign in' }}
            </button>

            <a href="http://localhost:8081/oauth2/authorization/google"
              class="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium text-gray-700 dark:text-gray-300">
              🌐 Continue with Google
            </a>

            <p class="text-center text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?
              <a routerLink="/register" class="text-blue-600 hover:underline font-medium">Sign up</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  handleLogin(): void {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return;
    }
    this.loading = true;
    this.error = '';
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.error = err.error?.message || err.error?.error || 'Invalid credentials';
        this.loading = false;
      }
    });
  }
}