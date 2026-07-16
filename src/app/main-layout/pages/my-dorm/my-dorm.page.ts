import { Component, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonButton,
  IonIcon,
  IonBadge,
  AlertController,
  ToastController,
  NavController,
  IonText,
  IonSegment,
  IonSegmentButton,
  IonRefresherContent,
  ActionSheetController,
  IonRefresher,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline,
  trashOutline,
  powerOutline,
  arrowBackCircleOutline,
  alertCircleOutline,
  businessOutline,
  locationOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  checkmarkCircle,
  star,
  documentTextOutline,
  optionsOutline,
  warningOutline,
  searchOutline,
  arrowUpOutline,
} from 'ionicons/icons';
import { DormServices } from 'src/app/services/dormServices';
import { AuthenService } from 'src/app/services/authenService';
import { DormSummary, MasterType } from 'src/app/model/dorm.model';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { FilterGroupComponent } from '../../components/filter-group/filter-group.component';

@Component({
  selector: 'app-my-dorm',
  templateUrl: './my-dorm.page.html',
  styleUrls: ['./my-dorm.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonButton,
    IonIcon,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    CommonModule,
    FormsModule,
    LoadingUIComponent,
    IonText,
    RouterModule,
    IonRefresher,
    IonRefresherContent,
    FilterGroupComponent,
    IonFab,
    IonFabButton,
  ],
})
export class MyDormPage implements OnInit {
  userId: number | null = null;
  userRole = signal<number | null>(null);
  dorms = signal<DormSummary[]>([]);
  dormRequests = signal<DormSummary[]>([]);
  currentSegment = signal<'all' | 'requests'>('all');
  isLoading = signal<boolean>(false);
  searchQuery = signal<string>('');
  showScrollBtn = signal<boolean>(false);
  dormStatuses = signal<MasterType[]>([]);

  @ViewChild(IonContent, { static: false }) content!: IonContent;

  handleFilter(event: any) {
    if (event && event.search !== undefined) {
      this.searchQuery.set(event.search);
    }
  }

  filteredDorms = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.dorms();
    return this.dorms().filter(
      (d) =>
        d.DORM_NAME.toLowerCase().includes(q) ||
        (d.ADDRESS && d.ADDRESS.toLowerCase().includes(q))
    );
  });

  filteredRequests = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.dormRequests();
    return this.dormRequests().filter(
      (d) =>
        d.DORM_NAME.toLowerCase().includes(q) ||
        (d.ADDRESS && d.ADDRESS.toLowerCase().includes(q))
    );
  });

  constructor(
    private dormSv: DormServices,
    private authSv: AuthenService,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController
  ) {
    addIcons({
      createOutline,
      trashOutline,
      powerOutline,
      arrowBackCircleOutline,
      alertCircleOutline,
      businessOutline,
      locationOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline,
      checkmarkCircle,
      star,
      documentTextOutline,
      optionsOutline,
      warningOutline,
      searchOutline,
      arrowUpOutline,
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
    this.loadDormStatuses();
  }

  loadDormStatuses() {
    this.dormSv.getDormStatuses().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.dormStatuses.set(res.data);
        } else if (Array.isArray(res)) {
          this.dormStatuses.set(res);
        }
      },
      error: (err) => console.error('Failed to load dorm statuses', err)
    });
  }

  segmentChanged(event: any) {
    this.currentSegment.set(event.detail.value);
  }

  handleRefresh(event: any) {
    this.loadData();
    setTimeout(() => {
      event.target.complete();
    }, 500);
  }

  loadMyDorms() {
    this.isLoading.set(true);

    const requestObservable =
      this.userRole() === 3
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
        },
      });
  }

  loadDormRequests() {
    this.isLoading.set(true);
    this.dormSv
      .getPendingDormReq()
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
        },
      });
  }

  editDorm(dorm: DormSummary) {
    this.navCtrl.navigateForward(
      `/dorm-register/${this.userId}/${dorm.DORM_ID}`
    );
  }

  viewReqDormDetail(dorm: DormSummary) {
    this.navCtrl.navigateForward(['/dorm-detail', dorm.DORM_ID], {
      queryParams: { adminReq: 'true' },
    });
  }

  viewDormDetail(dorm: DormSummary) {
    this.navCtrl.navigateForward([
      '/dorm-detail',
      dorm.DORM_ID,
      { queryParams: { preview: 'true' } },
    ]);
  }

  async openStatusMenu(dorm: DormSummary) {
    const dynamicButtons: any[] = this.dormStatuses()
      .filter((status) => !(status.id === 4 && this.userRole() !== 3))
      .map((status) => {
        let iconName: string | undefined;
        if (status.id === 1) iconName = 'checkmark-circle-outline';
        else if (status.id === 2) iconName = 'warning-outline';
        else if (status.id === 3) iconName = 'close-circle-outline';
        else if (status.id === 4) iconName = 'alert-circle-outline';
        
        const isCurrent = status.id === dorm.DORM_STATUS_ID;
        return {
          text: status.name,
          icon: iconName,
          cssClass: isCurrent ? 'action-sheet-selected-status' : undefined,
          handler: () => {
            this.changeStatus(dorm, status.id);
          }
        };
      });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'จัดการสถานะหอพัก',
      cssClass: 'minimal-action-sheet',
      buttons: [
        ...dynamicButtons,
        {
          text: 'ลบ',
          role: 'destructive',
          icon: 'trash-outline',
          
          handler: () => {
            this.deleteDorm(dorm);
          },
        },
        {
          text: 'ยกเลิก',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  private changeStatus(dorm: DormSummary, newStatus: number) {
    this.isLoading.set(true);
    this.dormSv
      .changeDormStatus(dorm.DORM_ID, newStatus)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.showToast('อัปเดตสถานะสำเร็จ', 'success');
          this.loadMyDorms();
        },
        error: (err) => {
          console.error(err);
          this.showToast('อัปเดตสถานะไม่สำเร็จ', 'danger');
        },
      });
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
            this.dormSv
              .removeDorm(dorm.DORM_ID)
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.showToast('ลบหอพักเรียบร้อยแล้ว', 'success');
                  this.loadData();
                },
                error: (err) => {
                  console.error(err);
                  this.showToast('ลบหอพักไม่สำเร็จ', 'danger');
                },
              });
          },
        },
      ],
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
            this.dormSv
              .approveDormReq({ dorm_id: dorm.DORM_ID, approve_status: true })
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.showToast('อนุมัติหอพักสำเร็จ', 'success');
                  this.loadData();
                },
                error: (err) => {
                  console.error(err);
                  this.showToast('เกิดข้อผิดพลาด', 'danger');
                },
              });
          },
        },
      ],
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
          placeholder: 'ระบุเหตุผลการปฏิเสธคำร้องขอ...',
        },
      ],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ปฏิเสธ',
          role: 'destructive',
          handler: (data) => {
            this.isLoading.set(true);
            this.dormSv
              .approveDormReq({
                dorm_id: dorm.DORM_ID,
                approve_status: false,
                msg: data.msg,
              })
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.showToast('ปฏิเสธคำร้องขอสำเร็จ', 'success');
                  this.loadData();
                },
                error: (err) => {
                  console.error(err);
                  this.showToast('เกิดข้อผิดพลาด', 'danger');
                },
              });
          },
        },
      ],
    });
    await alert.present();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  goBack() {
    if (this.authSv.currentUserValue?.role != 3) {
      this.navCtrl.navigateRoot('/');
    } else {
      this.navCtrl.back();
    }
  }

  onScroll(event: any) {
    if (event.detail.scrollTop > 300) {
      this.showScrollBtn.set(true);
    } else {
      this.showScrollBtn.set(false);
    }
  }

  scrollToTop() {
    if (this.content) {
      this.content.scrollToTop(500);
    }
  }
}
