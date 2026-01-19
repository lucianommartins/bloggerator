import { Injectable, inject, signal, computed } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, User, user } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private provider = new GoogleAuthProvider();
  
  private userSignal = toSignal(user(this.auth));
  
  readonly currentUser = computed(() => this.userSignal() ?? null);
  readonly isAuthenticated = computed(() => !!this.userSignal());
  readonly isLoading = signal(true);

  constructor() {
    // Atualiza loading após verificar estado inicial
    this.auth.onAuthStateChanged(() => {
      this.isLoading.set(false);
    });
  }

  async signInWithGoogle(): Promise<User | null> {
    try {
      const result = await signInWithPopup(this.auth, this.provider);
      return result.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
}
