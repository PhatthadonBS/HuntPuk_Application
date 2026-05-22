import { Component, NgZone, signal, OnInit, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading-service';
import { LoadingUIComponent } from "./main-layout/components/loading-ui/loading-ui.component";
import { SplashScreenComponent } from "./main-layout/components/splash-screen/splash-screen.component";
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { forkJoin, timer, of, firstValueFrom } from 'rxjs';
import { delay } from 'rxjs/operators';
import { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, CommonModule, LoadingUIComponent, SplashScreenComponent],
})
export class AppComponent implements OnInit, OnDestroy {
  private appStateListener?: PluginListenerHandle;
  private backgroundIntervalId?: any;
  public isSplashActive = signal<boolean>(true);

  constructor(public loadingSv: LoadingService, private ngZone: NgZone) {
    
  }

  async ngOnInit() {
    this.initializeApp();
    this.setupAppStateListener();
    this.startBackgroundOperations();
  }

  ngOnDestroy() {
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
    this.stopBackgroundOperations();
  }

  private async initializeApp() {
    // Reduced minimum delay to 2.5 seconds for a "lightweight" feel
    const loadInitialData$ = of('API Data Loaded').pipe(delay(500));
    const minimumDelay$ = timer(2500);

    try {
      await firstValueFrom(forkJoin([loadInitialData$, minimumDelay$]));
      
      await SplashScreen.hide();
      this.isSplashActive.set(false);
      console.log('App initialized.');
    } catch (error) {
      console.error('Initialization error:', error);
      await SplashScreen.hide();
      this.isSplashActive.set(false);
    }
  }

  private async setupAppStateListener() {
    this.appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
      this.ngZone.run(() => {
        if (!isActive) {
          this.stopBackgroundOperations();
        } else {
          this.startBackgroundOperations();
        }
      });
    });
  }

  private startBackgroundOperations() {
    if (!this.backgroundIntervalId) {
      this.backgroundIntervalId = setInterval(() => {
        // Background polling logic here
      }, 10000);
    }
  }

  private stopBackgroundOperations() {
    if (this.backgroundIntervalId) {
      clearInterval(this.backgroundIntervalId);
      this.backgroundIntervalId = undefined;
    }
  }
}

