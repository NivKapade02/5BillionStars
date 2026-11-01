import { Routes } from '@angular/router';
import { BookingComponent } from './booking.component';
import { HomeComponent } from './home.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  { path: 'book', component: BookingComponent },
  { path: 'index.html', redirectTo: '' },
  { path: 'reservation.html', redirectTo: 'book' },
  { path: '**', redirectTo: '' }
];
