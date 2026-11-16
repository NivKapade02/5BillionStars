import { Routes } from '@angular/router';
import { adminAuthGuard } from './admin-auth.service';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./home.component').then(m => m.HomeComponent), data: { seo: 'home' } },
  { path: 'book', loadComponent: () => import('./booking.component').then(m => m.BookingComponent), data: { seo: 'book' } },
  { path: 'booking/:id', redirectTo: 'book' },
  { path: 'admin/login', loadComponent: () => import('./admin-login.component').then(m => m.AdminLoginComponent), data: { seo: 'private' } },
  { path: 'admin', loadComponent: () => import('./admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [adminAuthGuard], data: { seo: 'private' } },
  { path: 'policies', loadComponent: () => import('./policies-page.component').then(m => m.PoliciesPageComponent), data: { seo: 'policies' } },
  { path: 'index.html', redirectTo: '' },
  { path: 'reservation.html', redirectTo: 'book' },
  { path: '**', redirectTo: '' }
];
