import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  email = '';
  password = '';
  errorMessage = '';

  constructor(
    private readonly authService: AdminAuthService,
    private readonly router: Router
  ) {}

  async submit(): Promise<void> {
    let valid = false;
    try { valid = await this.authService.login(this.email, this.password); }
    catch { this.errorMessage = 'Unable to sign in. Check your email, password and internet connection.'; return; }

    if (valid) {
      this.router.navigateByUrl('/admin');
      return;
    }

    this.errorMessage = 'Unable to sign in. Use the designated Firebase admin account.';
  }
}
