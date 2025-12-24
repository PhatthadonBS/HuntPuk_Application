import { Component, OnInit } from '@angular/core';
import { IonContent, IonSpinner } from "@ionic/angular/standalone";

@Component({
  selector: 'app-loading-ui',
  templateUrl: './loading-ui.component.html',
  styleUrls: ['./loading-ui.component.scss'],
  imports: [IonSpinner, IonContent],
})
export class LoadingUIComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
