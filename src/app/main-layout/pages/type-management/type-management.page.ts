import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, IonLabel, IonList, IonItem, IonButton, IonIcon, IonInput, IonItemDivider, AlertController } from '@ionic/angular/standalone';
import { DormServices } from 'src/app/services/dormServices';
import { MasterType } from 'src/app/model/dorm.model';
import { addIcons } from 'ionicons';
import { trashOutline, addCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-type-management',
  templateUrl: './type-management.page.html',
  styleUrls: ['./type-management.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonSegment, IonSegmentButton, IonLabel, IonList, IonItem, IonButton, IonIcon, IonInput, IonItemDivider, CommonModule, FormsModule]
})
export class TypeManagementPage implements OnInit {
  selectedSegment: 'dorm' | 'room' = 'dorm';
  dormTypes: MasterType[] = [];
  roomTypes: MasterType[] = [];
  newDormTypeName: string = '';
  newRoomTypeName: string = '';

  constructor(
    private dormServices: DormServices,
    private alertController: AlertController
  ) {
    addIcons({ trashOutline, addCircleOutline });
  }

  ngOnInit() {
    this.loadDormTypes();
    this.loadRoomTypes();
  }

  loadDormTypes() {
    this.dormServices.getDormTypes().subscribe({
      next: (data) => this.dormTypes = data,
      error: (err) => console.error('Failed to load dorm types', err)
    });
  }

  loadRoomTypes() {
    this.dormServices.getRoomTypes().subscribe({
      next: (data) => this.roomTypes = data,
      error: (err) => console.error('Failed to load room types', err)
    });
  }

  segmentChanged(event: any) {
    this.selectedSegment = event.detail.value;
  }

  addDormType() {
    if (!this.newDormTypeName.trim()) return;
    this.dormServices.addDormType(this.newDormTypeName).subscribe({
      next: () => {
        this.newDormTypeName = '';
        this.loadDormTypes();
      },
      error: (err) => console.error('Failed to add dorm type', err)
    });
  }

  addRoomType() {
    if (!this.newRoomTypeName.trim()) return;
    this.dormServices.addRoomType(this.newRoomTypeName).subscribe({
      next: () => {
        this.newRoomTypeName = '';
        this.loadRoomTypes();
      },
      error: (err) => console.error('Failed to add room type', err)
    });
  }

  async confirmDeleteDormType(type: MasterType) {
    const alert = await this.alertController.create({
      header: 'ยืนยันการลบ',
      message: `คุณต้องการลบประเภทหอพัก "${type.name}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'ลบ', role: 'destructive', handler: () => this.deleteDormType(type.id) }
      ]
    });
    await alert.present();
  }

  deleteDormType(id: number) {
    this.dormServices.deleteDormType(id).subscribe({
      next: () => this.loadDormTypes(),
      error: (err) => console.error('Failed to delete dorm type', err)
    });
  }

  async confirmDeleteRoomType(type: MasterType) {
    const alert = await this.alertController.create({
      header: 'ยืนยันการลบ',
      message: `คุณต้องการลบประเภทห้องพัก "${type.name}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'ลบ', role: 'destructive', handler: () => this.deleteRoomType(type.id) }
      ]
    });
    await alert.present();
  }

  deleteRoomType(id: number) {
    this.dormServices.deleteRoomType(id).subscribe({
      next: () => this.loadRoomTypes(),
      error: (err) => console.error('Failed to delete room type', err)
    });
  }
}
