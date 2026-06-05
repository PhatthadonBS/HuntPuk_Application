import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
  withRouterConfig,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { loadingInterceptor } from './app/services/loading-interceptor';
import { authInterceptor } from './app/services/auth-interceptor';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeTh from '@angular/common/locales/th';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

registerLocaleData(localeTh);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: LOCALE_ID, useValue: 'th' },

    provideIonicAngular({ animated: false }),

    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withRouterConfig({
        onSameUrlNavigation: 'reload',
      })
    ),
    provideHttpClient(
      withInterceptors([loadingInterceptor, authInterceptor])
    ),
  ],
});

defineCustomElements(window);