import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { map, take } from 'rxjs/operators';

// Auth Guard - waits for Firebase to load auth state
const authGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1), // Take first emission (after Firebase loads)
    map(user => {
      if (user) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};

// Guest Guard - redirect to home if already logged in
const guestGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (!user) {
        return true;
      }
      return router.createUrlTree(['/']);
    })
  );
};

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/main/main.component').then(m => m.MainComponent),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
