import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonList, IonItem, IonButton, IonIcon, IonInput, IonItemDivider, AlertController, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol, IonButtons, IonBackButton, IonModal, IonFooter } from '@ionic/angular/standalone';
import { DormServices } from 'src/app/services/dormServices';
import { MasterType, DormZone } from 'src/app/model/dorm.model';
import { addIcons } from 'ionicons';
import { trashOutline, addCircleOutline, createOutline, closeOutline, mapOutline, locationOutline, businessOutline, bedOutline, cashOutline, alertCircleOutline, optionsOutline, pinOutline, fingerPrintOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { GoogleMapService } from 'src/app/services/google-map-service';

declare var google: any;

@Component({
  selector: 'app-type-management',
  templateUrl: './type-management.page.html',
  styleUrls: ['./type-management.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonList, IonItem, IonButton, IonIcon, IonInput, IonItemDivider, CommonModule, FormsModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol, IonButtons, IonBackButton, IonModal, IonFooter]
})
export class TypeManagementPage implements OnInit {
  // Data arrays
  bedTypes = signal<MasterType[]>([]);
  dormTypes = signal<MasterType[]>([]);
  dormStatuses = signal<MasterType[]>([]);
  dormZones = signal<DormZone[]>([]);
  priceTypes = signal<MasterType[]>([]);
  roomTypes = signal<MasterType[]>([]);

  // Modal State
  activeModal = signal<string | null>(null);
  editItemId = signal<number | null>(null);

  // Input states
  newItemName = signal<string>('');
  newZoneLat = signal<number | null>(null);
  newZoneLng = signal<number | null>(null);

  // Map Modal State
  isMapModalOpen = signal<boolean>(false);
  refPoint = signal<{lat: number, lng: number} | null>(null);

  // Map state
  map: any = null;
  marker: any = null;

  constructor(
    private dormServices: DormServices,
    private alertController: AlertController,
    private gMapSv: GoogleMapService
  ) {
    addIcons({ trashOutline, addCircleOutline, createOutline, closeOutline, mapOutline, locationOutline, businessOutline, bedOutline, cashOutline, alertCircleOutline, optionsOutline, pinOutline, fingerPrintOutline, checkmarkCircleOutline });
  }

  ngOnInit() {
    this.loadAllTypes();
  }

  loadAllTypes() {
    this.dormServices.getBedTypes().subscribe(data => this.bedTypes.set(data));
    this.dormServices.getDormTypes().subscribe(data => this.dormTypes.set(data));
    this.dormServices.getDormStatuses().subscribe(data => this.dormStatuses.set(data));
    this.dormServices.getZones().subscribe(res => {
      if (res.success) this.dormZones.set(res.data);
    });
    this.dormServices.getPriceTypes().subscribe(data => this.priceTypes.set(data));
    this.dormServices.getRoomTypes().subscribe(data => this.roomTypes.set(data));
  }

  openModal(type: string) {
    this.activeModal.set(type);
    this.editItemId.set(null);
    this.newItemName.set('');
    this.newZoneLat.set(null);
    this.newZoneLng.set(null);
  }

  closeModal() {
    this.editItemId.set(null);
    this.activeModal.set(null);
    this.destroyMap();
  }

  openMapModal() {
    this.refPoint.set(this.newZoneLat() && this.newZoneLng() ? { lat: this.newZoneLat()!, lng: this.newZoneLng()! } : null);
    this.isMapModalOpen.set(true);
  }

  closeMapModal() {
    this.isMapModalOpen.set(false);
  }

  onMapModalDismissed() {
    this.destroyMap();
  }

  async onMapModalPresented(event: any) {
    const el = document.getElementById('map-el');
    if (!el) return;

    try {
      await this.gMapSv.load();
      // Default to existing point if set, else Bangkok/Mahasarakham
      const center = this.refPoint() || { lat: 16.2458428, lng: 103.2492193 };
      this.map = new google.maps.Map(el, {
        center,
        zoom: 15,
        disableDefaultUI: true,
        clickableIcons: false,
      });

      if (this.refPoint()) {
        this.renderMarker(this.refPoint()!);
      }

      this.map.addListener('click', (event: any) => {
        const latLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        this.refPoint.set(latLng);
        this.renderMarker(latLng);
      });
    } catch (e) {
      console.error('Map init failed', e);
    }
  }

  confirmMapSelection() {
    if (this.refPoint()) {
      this.newZoneLat.set(this.refPoint()!.lat);
      this.newZoneLng.set(this.refPoint()!.lng);
    }
    this.closeMapModal();
  }

  renderMarker(pos: { lat: number; lng: number }) {
    if (this.marker) this.marker.setMap(null);
    this.marker = new google.maps.Marker({
      position: pos,
      map: this.map,
      clickable: false,
    });
  }

  destroyMap() {
    this.map = null;
    this.marker = null;
  }

  
  editItem(item: any, type: string) {
    this.editItemId.set(item.id || item.ZONE_ID);
    this.newItemName.set(item.name || item.ZONE_NAME);
    if (type === 'zone') {
      this.newZoneLat.set(item.lat);
      this.newZoneLng.set(item.lng);
      
    }
  }

  // --- Add Methods ---
  async saveItem() {
    const name = this.newItemName().trim();
    if (!name) return;

    const modalType = this.activeModal();
    const editId = this.editItemId();

    let typeNameTh = '';
    switch(modalType) {
      case 'bed': typeNameTh = 'ประเภทเตียง'; break;
      case 'dorm': typeNameTh = 'ประเภทหอพัก'; break;
      case 'status': typeNameTh = 'สถานะหอพัก'; break;
      case 'zone': typeNameTh = 'โซนหอพัก'; break;
      case 'price': typeNameTh = 'ประเภทราคา'; break;
      case 'room': typeNameTh = 'ประเภทห้องพัก'; break;
    }

    const actionText = editId ? 'แก้ไข' : 'เพิ่ม';

    const alert = await this.alertController.create({
      header: `ยืนยันการ${actionText}`,
      message: `คุณต้องการ${actionText}${typeNameTh} "${name}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { 
          text: 'ยืนยัน', 
          role: 'confirm',
          handler: () => {
            this.executeSave(modalType!, editId, name);
          }
        }
      ]
    });
    await alert.present();
  }

  executeSave(modalType: string, editId: number | null, name: string) {
    let obs$;

    if (editId) {
      const lat = this.newZoneLat() ?? undefined;
      const lng = this.newZoneLng() ?? undefined;
      obs$ = this.dormServices.updateMasterType(modalType, editId, name, lat, lng);
    } else {
      switch (modalType) {
        case 'bed': obs$ = this.dormServices.addBedType(name); break;
        case 'dorm': obs$ = this.dormServices.addDormType(name); break;
        case 'status': obs$ = this.dormServices.addDormStatus(name); break;
        case 'zone': 
          const lat = this.newZoneLat() ?? undefined;
          const lng = this.newZoneLng() ?? undefined;
          obs$ = this.dormServices.addDormZone(name, lat, lng); 
          break;
        case 'price': obs$ = this.dormServices.addPriceType(name); break;
        case 'room': obs$ = this.dormServices.addRoomType(name); break;
        default: return;
      }
    }

    obs$.subscribe({
      next: () => {
        this.newItemName.set('');
        this.newZoneLat.set(null);
        this.newZoneLng.set(null);
        this.editItemId.set(null);
        // Do not destroy map here, we might want to stay in modal
        this.loadAllTypes();
        if (modalType === 'zone' && !editId) {
          this.closeModal();
        }
      },
      error: err => console.error('Failed to save item', err)
    });
  }

  // --- Delete Methods ---
  async confirmDelete(id: number, name: string, type: string) {
    let typeNameTh = '';
    switch(type) {
      case 'bed': typeNameTh = 'ประเภทเตียง'; break;
      case 'dorm': typeNameTh = 'ประเภทหอพัก'; break;
      case 'status': typeNameTh = 'สถานะหอพัก'; break;
      case 'zone': typeNameTh = 'โซนหอพัก'; break;
      case 'price': typeNameTh = 'ประเภทราคา'; break;
      case 'room': typeNameTh = 'ประเภทห้องพัก'; break;
    }

    const alert = await this.alertController.create({
      header: 'ยืนยันการลบ',
      message: `คุณต้องการลบ${typeNameTh} "${name}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'ลบ', role: 'destructive', handler: () => this.deleteItem(id, type) }
      ]
    });
    await alert.present();
  }

  deleteItem(id: number, type: string) {
    let obs$;
    switch (type) {
      case 'bed': obs$ = this.dormServices.deleteBedType(id); break;
      case 'dorm': obs$ = this.dormServices.deleteDormType(id); break;
      case 'status': obs$ = this.dormServices.deleteDormStatus(id); break;
      case 'zone': obs$ = this.dormServices.deleteDormZone(id); break;
      case 'price': obs$ = this.dormServices.deletePriceType(id); break;
      case 'room': obs$ = this.dormServices.deleteRoomType(id); break;
      default: return;
    }

    obs$.subscribe({
      next: () => this.loadAllTypes(),
      error: err => {
        console.error('Failed to delete item', err);
        // Show alert for foreign key constraint violation
        this.alertController.create({
          header: 'ไม่สามารถลบได้',
          message: 'ข้อมูลนี้ถูกใช้งานอยู่',
          buttons: ['ตกลง']
        }).then(a => a.present());
      }
    });
  }
}
