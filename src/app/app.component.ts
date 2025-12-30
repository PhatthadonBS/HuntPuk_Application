import { Component, NgZone, signal } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { LoadingUIComponent } from './components/loading-ui/loading-ui.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, LoadingUIComponent, CommonModule],
})
export class AppComponent {

}
