import { Component, signal } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { LoadingUIComponent } from '../components/loading-ui/loading-ui.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, LoadingUIComponent, CommonModule],
})
export class HomePage {
  isLoading = signal(false);
  constructor() {}
}
