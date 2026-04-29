import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'chat',
    loadComponent: () => import('./features/chat/pages/chat-page.component').then(m => m.ChatPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'oauth-callback',
    loadComponent: () => import('./features/auth/oauth-callback/oauth-callback.component')
    .then(m => m.OAuthCallbackComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-page.component').then(m => m.AdminPageComponent),
    canActivate: [authGuard, adminGuard]
  },
  { path: '**', redirectTo: '/login' }
];