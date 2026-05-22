import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthenService } from '../services/authenService';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthenService);
  const router = inject(Router);

  if (authService.currentUserValue) {
    return true;
  }

  // Redirect to login if not authenticated
  return router.parseUrl('/login');
};
