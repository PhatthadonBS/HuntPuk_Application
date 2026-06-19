import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
  IonList, IonItem, IonThumbnail, IonLabel, IonButton, IonIcon, IonBadge,
  AlertController, ToastController, NavController, IonText, IonSegment, IonSegmentButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, powerOutline, arrowBackCircleOutline,
  alertCircleOutline, businessOutline, locationOutline, checkmarkCircleOutline, closeCircleOutline,
  timeOutline, checkmarkCircle, star, documentTextOutline
} from 'ionicons/icons';
import { DormServices } from 'src/app/services/dormServices';
import { AuthenService } from 'src/app/services/authenService';
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
    IonSegment, IonSegmentButton, CommonModule, FormsModule, LoadingUIComponent, IonText, RouterModule
  ]
})
export class MyDormPage implements OnInit {
  userId: number | null = null;
  userRole = signal<number | null>(null);
  dorms = signal<DormSummary[]>([]);
  dormRequests = signal<DormSummary[]>([]);
  currentSegment = signal<'all' | 'requests'>('all');
  isLoading = signal<boolean>(false);

  constructor(
    private dormSv: DormServices,
    private authSv: AuthenService,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {
    addIcons({
      createOutline, trashOutline, powerOutline, arrowBackCircleOutline,
      alertCircleOutline, businessOutline, locationOutline, checkmarkCircleOutline, closeCircleOutline,
      timeOutline, checkmarkCircle, star, documentTextOutline
    });
  }

  ngOnInit() {
    const user = this.authSv.currentUserValue;
    if (user) {
      this.userRole.set(user.role);
    }
    
    const id = this.route.snapshot.paramMap.get('user_id');
    if (id) {
      this.userId = Number(id);
      this.loadData();
    }
  }

  ionViewWillEnter() {
    if (this.userId) {
      this.loadData();
    }
  }

  loadData() {
    this.loadMyDorms();
    if (this.userRole() === 3) {
      this.loadDormRequests();
    }
  }

  segmentChanged(event: any) {
    this.currentSegment.set(event.detail.value);
  }

  loadMyDorms() {
    this.isLoading.set(true);
    
    const requestObservable = this.userRole() === 3 
      ? this.dormSv.getAllDormsAdmin()
      : this.dormSv.getDormByOwner(this.userId!);

    requestObservable
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.dorms.set(res.data);
          } else if (Array.isArray(res)) {
            this.dorms.set(res as any);
          }
        },
        error: (err) => {
          console.error(err);
          this.showToast('ไม่สามารถดึงข้อมูลหอพักได้', 'danger');
        }
      });
  }

  loadDormRequests() {
    this.isLoading.set(true);
    this.dormSv.getPendingDormReq()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res && res.data) {
            this.dormRequests.set(res.data);
          } else if (Array.isArray(res)) {
             this.dormRequests.set(res as any);
          }
        },
        error: (err) => {
          console.error(err);
        }
      });
  }

  editDorm(dorm: DormSummary) {
    this.navCtrl.navigateForward(`/dorm-register/${this.userId}/${dorm.DORM_ID}`);
  }

  viewReqDormDetail(dorm: DormSummary) {
    this.navCtrl.navigateForward(['/dorm-detail', dorm.DORM_ID], { queryParams: { adminReq: 'true' } });
  }

  viewDormDetail(dorm: DormSummary) {
    this.navCtrl.navigateForward(['/dorm-detail', dorm.DORM_ID]);
  }

  async toggleStatus(dorm: DormSummary) {
    const isClosing = dorm.DORM_STATUS_ID == 1;
    const alert = await this.alertCtrl.create({
      header: isClosing ? 'ปิดรับจองหอพัก?' : 'เปิดรับจองหอพัก?',
      message: isClosing 
        ? `คุณต้องการเปลี่ยนสถานะ "${dorm.DORM_NAME}" เป็น "ปิดรับจอง" หรือไม่?` 
        : `คุณต้องการเปลี่ยนสถานะ "${dorm.DORM_NAME}" เป็น "ว่าง" หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ยืนยัน',
          handler: () => {
            const newStatus = isClosing ? 2 : 1;
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
                  this.loadData();
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

  async approveRequest(dorm: DormSummary) {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการอนุมัติหอพัก',
      message: `คุณต้องการอนุมัติหอพัก "${dorm.DORM_NAME}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'อนุมัติ',
          handler: () => {
            this.isLoading.set(true);
            this.dormSv.approveDormReq({ dorm_id: dorm.DORM_ID, approve_status: true })
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.showToast('อนุมัติหอพักสำเร็จ', 'success');
                  this.loadData();
                },
                error: (err) => {
                  console.error(err);
                  this.showToast('เกิดข้อผิดพลาด', 'danger');
                }
              });
          }
        }
      ]
    });
    await alert.present();
  }

  async rejectRequest(dorm: DormSummary) {
    const alert = await this.alertCtrl.create({
      header: 'ปฏิเสธคำร้องขอ',
      message: `ปฏิเสธหอพัก "${dorm.DORM_NAME}"\n\nระบุเหตุผล (ถ้ามี):`,
      inputs: [
        {
          name: 'msg',
          type: 'textarea',
          placeholder: 'ระบุเหตุผลการปฏิเสธคำร้องขอ...'
        }
      ],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ปฏิเสธ',
          role: 'destructive',
          handler: (data) => {
            this.isLoading.set(true);
            this.dormSv.approveDormReq({ dorm_id: dorm.DORM_ID, approve_status: false, msg: data.msg })
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.showToast('ปฏิเสธคำร้องขอสำเร็จ', 'success');
                  this.loadData();
                },
                error: (err) => {
                  console.error(err);
                  this.showToast('เกิดข้อผิดพลาด', 'danger');
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
