import { Component } from '@angular/core';
import { IonSpinner } from '@ionic/angular/standalone';

@Component({
  selector: 'app-loading-ui',
  standalone: true,
  templateUrl: './loading-ui.component.html',
  styleUrls: ['./loading-ui.component.scss'],
  imports: [IonSpinner],
})
export class LoadingUIComponent {}