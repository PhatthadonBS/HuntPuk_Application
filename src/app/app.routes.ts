import { Routes } from '@angular/router';
import { LoggedInServices } from './services/logged-in-services';
import { AuthenService } from './services/authenService';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
    // canActivate: [LoggedInServices],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
    // canActivate: [LoggedInServices],
  },
  {
    path: 'forget-password',
    loadComponent: () =>
      import('./pages/forget-password/forget-password.page').then(
        (m) => m.ForgetPasswordPage
      ),
    // canActivate: [AuthenService],
  },
  {
    path: 'dorm-list',
    loadComponent: () =>
      import('./pages/dorm-list/dorm-list.page').then((m) => m.DormListPage),
    // canActivate: [AuthenService]
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.page').then( m => m.NotFoundPage)
  },
];
