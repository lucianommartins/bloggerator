import { Injectable, inject, signal, computed } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, User, user } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';

// Access control - only these domains and emails can access
const ALLOWED_DOMAINS = ['google.com'];
const ALLOWED_EMAILS = [
  'lucianomelomartins@gmail.com',
  'tabatha.sk@gmail.com'
];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private provider = new GoogleAuthProvider();
  
  private userSignal = toSignal(user(this.auth));
  
  readonly currentUser = computed(() => this.userSignal() ?? null);
  readonly isAuthenticated = computed(() => {
    const user = this.userSignal();
    return user ? this.isAuthorized(user) : false;
  });
  readonly isLoading = signal(true);
  readonly accessDenied = signal(false);

  constructor() {
    // Atualiza loading após verificar estado inicial
    this.auth.onAuthStateChanged(() => {
      this.isLoading.set(false);
    });
  }

  private isAuthorized(user: User): boolean {
    const email = user.email?.toLowerCase() || '';
    const domain = email.split('@')[1] || '';

    // Check if email is in allowlist
    if (ALLOWED_EMAILS.includes(email)) {
      return true;
    }

    // Check if domain is in allowed domains
    if (ALLOWED_DOMAINS.includes(domain)) {
      return true;
    }

    return false;
  }

  async signInWithGoogle(): Promise<User | null> {
    try {
      const result = await signInWithPopup(this.auth, this.provider);

      if (!this.isAuthorized(result.user)) {
        this.accessDenied.set(true);
        await this.signOut();
        return null;
      }

      this.accessDenied.set(false);
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.accessDenied.set(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
}
