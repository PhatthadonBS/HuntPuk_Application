import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
  IonList, IonItem, IonThumbnail, IonLabel, IonButton, IonIcon, IonBadge,
  AlertController, ToastController, NavController, IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  createOutline, trashOutline, powerOutline, arrowBackCircleOutline,
  alertCircleOutline, businessOutline, locationOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import { DormServices } from 'src/app/services/dormServices';
import { DormSummary } from 'src/app/model/dorm.model';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';

@Component({
  selector: 'app-my-dorm',
  templateUrl: './my-dorm.page.html',
  styleUrls: ['./my-dorm.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
    IonList, IonItem, IonThumbnail, IonLabel, IonButton, IonIcon, IonBadge,
    CommonModule, FormsModule, LoadingUIComponent, IonText, RouterModule
  ]
})
export class MyDormPage implements OnInit {
  userId: number | null = null;
  dorms = signal<DormSummary[]>([]);
  isLoading = signal<boolean>(false);

  constructor(
    private dormSv: DormServices,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {
    addIcons({
      createOutline, trashOutline, powerOutline, arrowBackCircleOutline,
      alertCircleOutline, businessOutline, locationOutline, checkmarkCircleOutline
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('user_id');
    if (id) {
      this.userId = Number(id);
      this.loadMyDorms();
    }
  }

  ionViewWillEnter() {
    if (this.userId) {
      this.loadMyDorms();
    }
  }

  loadMyDorms() {
    if (!this.userId) return;
    this.isLoading.set(true);
    this.dormSv.getDormByOwner(this.userId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.dorms.set(res.data);
          }
        },
        error: (err) => {
          console.error(err);
          this.showToast('ไม่สามารถดึงข้อมูลหอพักได้', 'danger');
        }
      });
  }

  editDorm(dorm: DormSummary) {
    this.navCtrl.navigateForward(`/dorm-register/${this.userId}/${dorm.DORM_ID}`);
  }

  async toggleStatus(dorm: DormSummary) {
    const isClosing = dorm.DORM_STATUS_ID === 1;
    const alert = await this.alertCtrl.create({
      header: isClosing ? 'ปิดรับจองหอพัก?' : 'เปิดรับจองหอพัก?',
      message: isClosing 
        ? `คุณต้องการเปลี่ยนสถานะ "${dorm.DORM_NAME}" เป็น "เต็ม" หรือไม่?` 
        : `คุณต้องการเปลี่ยนสถานะ "${dorm.DORM_NAME}" เป็น "ว่าง" หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ยืนยัน',
          handler: () => {
            const newStatus = isClosing ? 3 : 1;
            this.isLoading.set(true);
            this.dormSv.changeDormStatus(dorm.DORM_ID, newStatus)
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.showToast('อัปเดตสถานะสำเร็จ', 'success');
                  this.loadMyDorms();
                },
                error: (err) => {
                  console.error(err);
                  this.showToast('อัปเดตสถานะไม่สำเร็จ', 'danger');
                }
              });
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteDorm(dorm: DormSummary) {
    const alert = await this.alertCtrl.create({
      header: 'ลบหอพัก?',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${dorm.DORM_NAME}"? การกระทำนี้ไม่สามารถย้อนกลับได้`,
      cssClass: 'danger-alert',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ลบ',
          role: 'destructive',
          handler: () => {
            this.isLoading.set(true);
            this.dormSv.removeDorm(dorm.DORM_ID)
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.showToast('ลบหอพักเรียบร้อยแล้ว', 'success');
                  this.loadMyDorms();
                },
                error: (err) => {
                  console.error(err);
                  this.showToast('ลบหอพักไม่สำเร็จ', 'danger');
                }
              });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
