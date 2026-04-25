import { Component, NgZone, signal } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading-service';
import { LoadingUIComponent } from "./main-layout/components/loading-ui/loading-ui.component";

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, CommonModule, LoadingUIComponent],
})
export class AppComponent {
  constructor(public loadingSv: LoadingService) {
    
  }
}
 