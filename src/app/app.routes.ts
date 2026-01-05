import { Routes } from '@angular/router';
import { MainLayoutPage } from './main-layout/main-layout.page';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutPage,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./main-layout/pages/home/home.page').then((m) => m.HomePage),
        runGuardsAndResolvers: 'always',
      },
      {
        path: 'dorms',
        loadComponent: () =>
          import('./main-layout/pages/dorm-list/dorm-list.page').then(
            (m) => m.DormListPage
          ),
      },
      {
        path: 'profile/:user_id',
        loadComponent: () =>
          import('./main-layout/pages/user-detail/user-detail.page').then(
            (m) => m.UserDetailPage
          ),
      },
      {
        path: 'forgotPasswd',
        loadComponent: () =>
          import(
            './main-layout/pages/forget-password/forget-password.page'
          ).then((m) => m.ForgetPasswordPage),
      },
      {
        path: 'profile-update/:user_id',
        loadComponent: () =>
          import('./main-layout/pages/profile-update/profile-update.page').then(
            (m) => m.ProfileUpdatePage
          ),
      },
    ],
  },

  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
