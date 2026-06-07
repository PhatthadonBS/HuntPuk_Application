import { Routes } from '@angular/router';
import { MainLayoutPage } from './main-layout/main-layout.page';
import { authGuard } from './utils/auth-guard';

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
        path: 'profile/:user_id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./main-layout/pages/user-detail/user-detail.page').then(
            (m) => m.UserDetailPage
          ),
      },

      {
        path: 'profile-update/:user_id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./main-layout/pages/profile-update/profile-update.page').then(
            (m) => m.ProfileUpdatePage
          ),
      },

      {
        path: 'dorms',
        loadComponent: () =>
          import('./main-layout/pages/dorm-list/dorm-list.page').then(
            (m) => m.DormListPage
          ),
      },

      {
        path: 'dorm-detail/:dorm_id',
        loadComponent: () =>
          import('./main-layout/pages/dorm-detail/dorm-detail.page').then(
            (m) => m.DormDetailPage
          ),
      },

      {
        path: 'dorm-compare',
        loadComponent: () =>
          import('./main-layout/pages/dorm-compare/dorm-compare.page').then(
            (m) => m.DormComparePage
          ),
      },

      {
        path: 'member-management',
        canActivate: [authGuard],
        loadComponent: () =>
          import(
            './main-layout/pages/member-management/member-management.page'
          ).then((m) => m.MemberManagementPage),
      },
      {
        path: 'owner-profile/:user_id',
        loadComponent: () =>
          import('./main-layout/pages/owner-profile/owner-profile.page').then(
            (m) => m.OwnerProfilePage
          ),
      },
      {
        path: 'owner-profile-update/:user_id',
        loadComponent: () =>
          import(
            './main-layout/pages/owner-profile-update/owner-profile-update.page'
          ).then((m) => m.OwnerProfileUpdatePage),
      },
      {
        path: 'my-dorm/:user_id',
        canActivate: [authGuard],
        loadComponent: () => import('./main-layout/pages/my-dorm/my-dorm.page').then( m => m.MyDormPage)
      },
    ],
  },

  {
    path: 'my-favorites/:user_id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./main-layout/pages/my-favorites/my-favorites.page').then(
        (m) => m.MyFavoritesPage
      ),
  },

  {
    path: 'owner-register/:user_id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./main-layout/pages/owner-register/owner-register.page').then(
        (m) => m.OwnerRegisterPage
      ),
  },
  {
    path: 'dorm-register/:user_id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./main-layout/pages/dorm-register/dorm-register.page').then(
        (m) => m.DormRegisterPage
      ),
  },
  {
    path: 'dorm-register/:user_id/:dorm_id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./main-layout/pages/dorm-register/dorm-register.page').then(
        (m) => m.DormRegisterPage
      ),
  },
  {
    path: 'forgotPasswd',
    loadComponent: () =>
      import('./main-layout/pages/forget-password/forget-password.page').then(
        (m) => m.ForgetPasswordPage
      ),
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
    path: 'owner-requests',
    loadComponent: () =>
      import('./main-layout/pages/owner-requests/owner-requests.page').then(
        (m) => m.OwnerRequestsPage
      ),
  },

  {
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
