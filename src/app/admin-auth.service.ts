import { inject, Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ADMIN_UID, getFirebase } from './firebase-client';

export type AdminRole = 'super_admin' | 'manager';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private authenticated = false;
  constructor(private router: Router) {}

  async login(email: string, password: string): Promise<boolean> {
    const { auth, authSdk } = await getFirebase();
    try {
      await authSdk.setPersistence(auth, authSdk.browserSessionPersistence);
      const result = await authSdk.signInWithEmailAndPassword(auth, email.trim(), password);
      this.authenticated = result.user.uid === ADMIN_UID;
      if (!this.authenticated) await authSdk.signOut(auth);
      return this.authenticated;
    } catch (error) {
      this.authenticated = false;
      throw error;
    }
  }

  async restoreSession(): Promise<boolean> {
    const { auth } = await getFirebase();
    await auth.authStateReady();
    this.authenticated = auth.currentUser?.uid === ADMIN_UID;
    return this.authenticated;
  }

  async sendPasswordReset(): Promise<void> {
    const { auth, authSdk } = await getFirebase();
    if (auth.currentUser?.uid !== ADMIN_UID || !auth.currentUser.email) throw new Error('Please sign in again.');
    await authSdk.sendPasswordResetEmail(auth, auth.currentUser.email);
  }

  isAuthenticated(): boolean { return this.authenticated; }

  async logout(): Promise<void> {
    const { auth, authSdk } = await getFirebase();
    await authSdk.signOut(auth);
    this.authenticated = false;
    await this.router.navigateByUrl('/admin/login');
  }

  get currentUser() {
    return this.authenticated ? { name: 'Admin', role: 'super_admin' as AdminRole } : null;
  }
}

export const adminAuthGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  try { if (await auth.restoreSession()) return true; } catch { /* Show the login page on connection failure. */ }
  return router.parseUrl('/admin/login');
};
