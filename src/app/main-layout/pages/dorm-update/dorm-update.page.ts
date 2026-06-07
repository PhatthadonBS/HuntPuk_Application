import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-dorm-update',
  templateUrl: './dorm-update.page.html',
  styleUrls: ['./dorm-update.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class DormUpdatePage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
