import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
  IonSegment, IonSegmentButton, IonLabel, IonList, IonItem, IonAvatar, IonImg,
  IonIcon, IonButton, IonAlert, ToastController, AlertController, IonItemSliding,
  IonItemOptions, IonItemOption, IonModal, IonInput,
  IonRefresher, IonRefresherContent
} from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, closeOutline, trashOutline, createOutline, documentTextOutline, cubeOutline, cameraOutline, imageOutline, informationCircleOutline } from 'ionicons/icons';
import { DormServices } from 'src/app/services/dormServices';
import { FacilityItem } from 'src/app/model/dorm.model';

@Component({
  selector: 'app-facility-management',
  templateUrl: './facility-management.page.html',
  styleUrls: ['./facility-management.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
    IonSegment, IonSegmentButton, IonLabel, IonList, IonItem, IonAvatar, IonImg,
    IonIcon, IonButton, IonItemSliding, IonItemOptions, IonItemOption, IonModal, IonInput,
    CommonModule, FormsModule, IonRefresher, IonRefresherContent
  ]
})
export class FacilityManagementPage implements OnInit {
  
  currentSegment = signal<'all' | 'requests'>('all');
  allFacilities = signal<FacilityItem[]>([]);
  facilityRequests = signal<FacilityItem[]>([]);
  isLoading = signal<boolean>(false);
  
  isEditModalOpen = signal<boolean>(false);
  editFacName = signal<string>('');
  editingFacId = signal<number | null>(null);
  editSelectedFile = signal<File | null>(null);
  editPreviewUrl = signal<string | null>(null);

  constructor(
    private dormSv: DormServices,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ checkmarkCircleOutline, closeCircleOutline, closeOutline, trashOutline, createOutline, documentTextOutline, cubeOutline, cameraOutline, imageOutline, informationCircleOutline });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadAllFacilities();
    this.loadFacilityRequests();
  }

  handleRefresh(event: any) {
    this.loadData();
    setTimeout(() => {
      event.target.complete();
    }, 500);
  }

  loadAllFacilities() {
    this.isLoading.set(true);
    this.dormSv.getFacilities().subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.allFacilities.set(res.data);
        } else if (Array.isArray(res)) {
          this.allFacilities.set(res);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.allFacilities.set([]);
        this.isLoading.set(false);
      }
    });
  }

  loadFacilityRequests() {
    this.isLoading.set(true);
    this.dormSv.getFacilityRequests().subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.facilityRequests.set(res.data);
        } else if (Array.isArray(res)) {
          this.facilityRequests.set(res);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.facilityRequests.set([]);
        this.isLoading.set(false);
      }
    });
  }

  segmentChanged(event: any) {
    this.currentSegment.set(event.detail.value);
  }

  handleImageError(fac: FacilityItem) {
    fac.FAC_TYPE_ICON = '';
  }

  openEditModal(fac: FacilityItem) {
    this.editingFacId.set(fac.FAC_TYPE_ID);
    this.editFacName.set(fac.FAC_TYPE_NAME);
    this.editSelectedFile.set(null);
    this.editPreviewUrl.set(fac.FAC_TYPE_ICON || null);
    this.isEditModalOpen.set(true);
  }

  async selectNativeImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt
      });

      if (image && image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        
        const format = image.format || 'jpeg';
        const file = new File([blob], `icon_${new Date().getTime()}.${format}`, {
          type: `image/${format}`
        });
        
        this.editSelectedFile.set(file);
        this.editPreviewUrl.set(image.webPath);
      }
    } catch (e) {
      console.error('Camera error', e);
    }
  }

  async saveEditFacility() {
    const facId = this.editingFacId();
    if (!facId) return;
    
    if (!this.editFacName().trim()) {
      this.showToast('กรุณากรอกชื่อสิ่งอำนวยความสะดวก', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('fac_id', facId.toString());
    formData.append('fac_name', this.editFacName());
    
    const file = this.editSelectedFile();
    if (file) {
      formData.append('icon', file);
    }

    // Pass user_id = 1 for admin
    this.dormSv.updateFacility(1, formData).subscribe({
      next: () => {
        this.showToast('อัปเดตข้อมูลสำเร็จ', 'success');
        this.isEditModalOpen.set(false);
        this.loadData();
      },
      error: () => this.showToast('เกิดข้อผิดพลาดในการอัปเดต', 'danger')
    });
  }

  async approveFacility(fac: FacilityItem) {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการอนุมัติ',
      message: `คุณต้องการอนุมัติสิ่งอำนวยความสะดวก "${fac.FAC_TYPE_NAME}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { 
          text: 'ยืนยัน', 
          handler: () => {
            this.dormSv.approveFacility(fac.FAC_TYPE_ID).subscribe({
              next: () => {
                this.showToast('อนุมัติสำเร็จ', 'success');
                this.loadData();
              },
              error: () => this.showToast('เกิดข้อผิดพลาดในการอนุมัติ', 'danger')
            });
          } 
        }
      ]
    });
    await alert.present();
  }

  async rejectFacility(fac: FacilityItem) {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการปฏิเสธ',
      message: `คุณต้องการปฏิเสธคำร้องขอสิ่งอำนวยความสะดวก "${fac.FAC_TYPE_NAME}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { 
          text: 'ยืนยัน', 
          handler: () => {
            this.dormSv.rejectFacility(fac.FAC_TYPE_ID).subscribe({
              next: () => {
                this.showToast('ปฏิเสธคำร้องขอสำเร็จ', 'success');
                this.loadData();
              },
              error: () => this.showToast('เกิดข้อผิดพลาดในการปฏิเสธ', 'danger')
            });
          } 
        }
      ]
    });
    await alert.present();
  }

  async deleteFacility(fac: FacilityItem) {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการลบ',
      message: `คุณต้องการลบสิ่งอำนวยความสะดวก "${fac.FAC_TYPE_NAME}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { 
          text: 'ลบ', 
          role: 'destructive',
          handler: () => {
            this.dormSv.deleteFacility(fac.FAC_TYPE_ID).subscribe({
              next: () => {
                this.showToast('ลบสิ่งอำนวยความสะดวกสำเร็จ', 'success');
                this.loadData();
              },
              error: () => this.showToast('เกิดข้อผิดพลาดในการลบ', 'danger')
            });
          } 
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
