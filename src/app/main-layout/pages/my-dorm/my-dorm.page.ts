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
  IonModal,
  IonAvatar,
  IonSearchbar,
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
  chatbubbleOutline,
  trash,
  refreshCircleOutline,
} from 'ionicons/icons';
import { DormServices } from 'src/app/services/dormServices';
import { AuthenService } from 'src/app/services/authenService';
import {
  DormSummary,
  MasterType,
  FilterParams,
} from 'src/app/model/dorm.model';
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
    IonModal,
    IonAvatar,
    IonSearchbar,
  ],
})
export class MyDormPage implements OnInit {
  userId: number | null = null;
  userRole = signal<number | null>(null);
  dorms = signal<DormSummary[]>([]);
  dormRequests = signal<DormSummary[]>([]);
  isLoading = signal<boolean>(true);

  // Filters state
  currentSegment = signal<'all' | 'requests'>('all');
  searchQuery = signal<string>('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  selectedScore = signal<number | null>(null);
  maxWater = signal<number | null>(null);
  maxWaterLump = signal<number | null>(null);
  maxElect = signal<number | null>(null);
  sortByName = signal<string>('');
  sortByPrice = signal<string>('');
  sortByScore = signal<string>('');
  selectedZoneId = signal<number | null>(null);
  zones = signal<any[]>([]);
  initialParams = signal<FilterParams | null>(null);

  showScrollBtn = signal<boolean>(false);
  dormStatuses = signal<MasterType[]>([]);

  // Comments state (Admin)
  isCommentsModalOpen = signal<boolean>(false);
  commentsLoading = signal<boolean>(false);
  dormComments = signal<any[]>([]);
  selectedDormForComments = signal<number | null>(null);
  commentSearchQuery = signal<string>('');

  filteredComments = computed(() => {
    const query = this.commentSearchQuery().toLowerCase().trim();
    const comments = this.dormComments();

    if (!query) return comments;

    return comments.filter((c) => {
      const username = (c.USERNAME || 'Unknown User').toLowerCase();
      const content = (c.COMMENTS || '').toLowerCase();
      return username.includes(query) || content.includes(query);
    });
  });

  @ViewChild(IonContent, { static: false }) content!: IonContent;

  handleFilter(event: FilterParams) {
    if (event) {
      this.initialParams.set(event);
      this.searchQuery.set(event.search || '');
      this.minPrice.set(event.minPrice ?? null);
      this.maxPrice.set(event.maxPrice ?? null);
      this.selectedScore.set(event.score ?? null);
      this.maxWater.set(event.maxWater ?? null);
      this.maxWaterLump.set(event.maxWaterLump ?? null);
      this.maxElect.set(event.maxElect ?? null);
      this.sortByName.set(event.sortByName || '');
      this.sortByPrice.set(event.sortByPrice || '');
      this.sortByScore.set(event.sortByScore || '');
      this.selectedZoneId.set(event.zone ? Number(event.zone) : null);
    }
  }

  filteredDorms = computed(() => {
    return this.applyFiltersAndSort(this.dorms());
  });

  filteredRequests = computed(() => {
    return this.applyFiltersAndSort(this.dormRequests());
  });

  private applyFiltersAndSort(data: DormSummary[]): DormSummary[] {
    let result = [...data];

    const query = this.searchQuery().toLowerCase();
    const min = this.minPrice();
    const max = this.maxPrice();
    const score = this.selectedScore();
    const maxW = this.maxWater();
    const maxWLump = this.maxWaterLump();
    const maxE = this.maxElect();
    const zoneId = this.selectedZoneId();
    const sortPrice = this.sortByPrice();
    const sortName = this.sortByName();
    const sortScore = this.sortByScore();

    if (query) {
      result = result.filter((d) => d.DORM_NAME.toLowerCase().includes(query));
    }
    if (min !== null) {
      result = result.filter((d) => d.start_price >= min);
    }
    if (max !== null) {
      result = result.filter((d) => d.start_price <= max);
    }
    if (score !== null && score !== undefined && !isNaN(Number(score))) {
      const numScore = Number(score);
      result = result.filter((d) => {
        const dScore = Number(d.SCORE) || 0;
        return dScore >= numScore && dScore <= numScore + 0.9;
      });
    }
    if (zoneId) {
      const targetZoneId = Number(zoneId);
      if (!isNaN(targetZoneId)) {
        const targetZone = this.zones().find((z) => z.ZONE_ID === targetZoneId);
        const targetZoneName = targetZone?.ZONE_NAME || '';
        result = result.filter((d) => {
          if (d.ZONE_ID !== undefined) {
            return d.ZONE_ID === targetZoneId;
          }
          const dZone = (d.zone || d.ZONE_NAME)?.trim();
          return dZone === targetZoneName;
        });
      }
    }
    if (maxW !== null) {
      result = result.filter((d) => {
        const wUnit =
          d.WATER_UNIT !== undefined && d.WATER_UNIT !== null
            ? Number(d.WATER_UNIT)
            : null;
        return wUnit !== null && wUnit > 0 && wUnit <= maxW;
      });
    }
    if (maxWLump !== null) {
      result = result.filter((d) => {
        const wLump =
          d.WATER_LUMP !== undefined && d.WATER_LUMP !== null
            ? Number(d.WATER_LUMP)
            : null;
        return wLump !== null && wLump > 0 && wLump <= maxWLump;
      });
    }
    if (maxE !== null) {
      result = result.filter((d: any) => {
        const eUnit =
          d.ELECT_UNIT !== undefined && d.ELECT_UNIT !== null
            ? Number(d.ELECT_UNIT)
            : null;
        return eUnit !== null && eUnit <= maxE;
      });
    }

    if (sortName === 'asc') {
      result.sort((a, b) => a.DORM_NAME.localeCompare(b.DORM_NAME, 'th'));
    } else if (sortName === 'desc') {
      result.sort((a, b) => b.DORM_NAME.localeCompare(a.DORM_NAME, 'th'));
    }

    if (sortPrice === 'asc') {
      result.sort((a, b) => {
        if (a.start_price === 0 && b.start_price !== 0) return 1;
        if (b.start_price === 0 && a.start_price !== 0) return -1;
        return a.start_price - b.start_price;
      });
    } else if (sortPrice === 'desc') {
      result.sort((a, b) => b.start_price - a.start_price);
    }

    if (sortScore === 'desc') {
      result.sort((a, b) => Number(b.SCORE) - Number(a.SCORE));
    } else if (sortScore === 'asc') {
      result.sort((a, b) => Number(a.SCORE) - Number(b.SCORE));
    }

    return result;
  }

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
      chatbubbleOutline,
      trash,
      refreshCircleOutline,
    });
  }

  ngOnInit() {
    this.loadZones();
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

  loadZones() {
    this.dormSv.getZones().subscribe({
      next: (res: any) => {
        if (res.success && Array.isArray(res.data)) {
          this.zones.set(res.data);
        }
      },
      error: (err) => console.error('Error fetching zones', err),
    });
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
      error: (err) => console.error('Failed to load dorm statuses', err),
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
          },
        };
      });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'จัดการสถานะหอพัก',
      cssClass: 'minimal-action-sheet',
      buttons: [
        ...dynamicButtons,

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
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${dorm.DORM_NAME}"? \nการกระทำนี้ไม่สามารถย้อนกลับได้\nกรุณาพิมพ์ \"DELETE\" เพื่อยืนยัน`,
      cssClass: 'danger-alert',
      inputs: [
        {
          name: 'confirmText',
          type: 'text',
          placeholder: 'พิมพ์ DELETE',
        },
      ],

      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ลบ',
          role: 'destructive',
          handler: (data) => {
            if (data.confirmText !== 'DELETE') {
              this.showToast('พิมพ์คำยืนยันไม่ถูกต้อง', 'danger');
              return false;
            }
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
            return true;
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

  // --- Manage Comments (Admin) ---

  openManageComments(dorm: DormSummary) {
    this.selectedDormForComments.set(dorm.DORM_ID);
    this.isCommentsModalOpen.set(true);
    this.loadComments(dorm.DORM_ID);
  }

  closeManageComments() {
    this.isCommentsModalOpen.set(false);
    this.selectedDormForComments.set(null);
    this.dormComments.set([]);
  }

  private loadComments(dormId: number) {
    this.commentsLoading.set(true);
    this.dormSv
      .getReviewsByDormId(dormId)
      .pipe(finalize(() => this.commentsLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res && res.success) {
            this.dormComments.set(res.data || []);
          } else {
            this.dormComments.set([]);
          }
        },
        error: (err) => {
          console.error('Error loading comments:', err);
          this.dormComments.set([]);
        },
      });
  }

  async deleteComment(reviewId: number) {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการลบ',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบคอมเมนต์นี้?',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ลบ',
          role: 'destructive',
          handler: () => {
            this.commentsLoading.set(true);
            this.dormSv.deleteReview(reviewId).subscribe({
              next: (res) => {
                if (res && res.success) {
                  // Reload comments
                  const dormId = this.selectedDormForComments();
                  if (dormId) this.loadComments(dormId);
                  // Reload dorms because score might have changed
                  this.loadMyDorms();
                  this.showToast('ลบคอมเมนต์เรียบร้อยแล้ว', 'success');
                } else {
                  this.commentsLoading.set(false);
                  this.showToast('ไม่สามารถลบคอมเมนต์ได้', 'danger');
                }
              },
              error: (err) => {
                this.commentsLoading.set(false);
                this.showToast('เกิดข้อผิดพลาดในการลบคอมเมนต์', 'danger');
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }
}
