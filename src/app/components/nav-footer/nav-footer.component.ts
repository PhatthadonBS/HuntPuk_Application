import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { addIcons } from 'ionicons';
import { list, personAdd } from 'ionicons/icons';
import { IonIcon } from "@ionic/angular/standalone";

@Component({
  selector: 'app-nav-footer',
  templateUrl: './nav-footer.component.html',
  styleUrls: ['./nav-footer.component.scss'],
  imports: [IonIcon],
})
export class NavFooterComponent {
  constructor() {
    addIcons({ list, personAdd });
  }
  @Output() menuClick = new EventEmitter<void>();
  onMenuClick() {
    this.menuClick.emit();
  }
}
