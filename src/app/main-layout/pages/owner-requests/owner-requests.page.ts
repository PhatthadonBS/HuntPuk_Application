import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonAvatar,
  IonModal,
  IonTextarea,
  IonBadge,
  ToastController,
  AlertController,
  ActionSheetController,
  IonRefresher,
  IonRefresherContent,
  NavController,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  personOutline,
  mailOutline,
  timeOutline,
  chevronForwardOutline,
  alertCircleOutline,
  arrowBackCircleOutline,
  folderOpenOutline,
  linkOutline,
  callOutline,
  arrowForwardOutline,
  ellipsisVerticalOutline,
  chevronUpOutline,
  arrowUpOutline,
} from 'ionicons/icons';
import { UserServices } from 'src/app/services/userServices';
import { UserDormOwnerGetRes } from 'src/app/model/user.model';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-owner-requests',
  templateUrl: './owner-requests.page.html',
  styleUrls: ['./owner-requests.page.scss'],
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
    IonLabel,
    IonButton,
    IonIcon,
    IonAvatar,
    IonModal,
    IonTextarea,
    IonBadge,
    CommonModule,
    FormsModule,
    LoadingUIComponent,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonFab,
    IonFabButton,
  ],
})
export class OwnerRequestsPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  requests = signal<UserDormOwnerGetRes[]>([]);
  isLoading = signal<boolean>(false);
  selectedRequest = signal<UserDormOwnerGetRes | null>(null);
  isModalOpen = signal<boolean>(false);
  showScrollBtn = signal<boolean>(false);
  // Search & Filter State
  searchTerm = signal<string>('');
  selectedSegment = signal<number>(0);

  // Management State
  rejectReason = signal<string>('');
  showRejectInput = signal<boolean>(false);

  constructor(
    private userSv: UserServices,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private navCtrl: NavController
  ) {
    addIcons({
      closeOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      personOutline,
      mailOutline,
      timeOutline,
      chevronForwardOutline,
      alertCircleOutline,
      arrowBackCircleOutline,
      folderOpenOutline,
      linkOutline,
      callOutline,
      ellipsisVerticalOutline,
      chevronUpOutline,
      arrowUpOutline,
    });
  }

  ngOnInit() {
    this.fetchRequests();
  }

  scrollToTop() {
    this.content.scrollToTop(500);
  }

  handleRefresh(event: any) {
    this.fetchRequests();
    setTimeout(() => {
      event.target.complete();
    }, 500);
  }

  fetchRequests() {
    this.isLoading.set(true);
    this.userSv
      .getPendingOwnerRequests(this.searchTerm(), this.selectedSegment())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.requests.set(res.data);
          }
        },
        error: (err) => {
          console.error('Error fetching owner requests', err);
          this.showToast('Failed to load requests', 'danger');
        },
      });
  }

  onSearchChange(event: any) {
    this.searchTerm.set(event.detail.value || '');
    this.fetchRequests();
  }

  onSegmentChange(event: any) {
    this.selectedSegment.set(Number(event.detail.value));
    this.fetchRequests();
  }

  openRequest(req: UserDormOwnerGetRes) {
    this.selectedRequest.set(req);
    this.rejectReason.set('');
    this.showRejectInput.set(false);
    this.isModalOpen.set(true);
  }

  async openManageActionSheet(req: UserDormOwnerGetRes, event: Event) {
    event.stopPropagation();
    this.selectedRequest.set(req);

    const actionSheet = await this.actionSheetCtrl.create({
      mode: 'md',
      header: `จัดการคำขอ: ${req.FIRST_NAME || req.USERNAME}`,
      cssClass: 'minimal-action-sheet custom-req-sheet',
      buttons: [
        {
          text: 'อนุมัติ',
          icon: 'checkmark-circle-outline',
          cssClass: 'action-sheet-button',
          handler: () => {
            this.approve();
          },
        },
        {
          text: 'ปฏิเสธ',
          role: 'destructive',
          icon: 'close-circle-outline',
          cssClass: 'action-sheet-button',
          handler: () => {
            this.reject();
          },
        },
        {
          text: 'ยกเลิก',
          role: 'cancel',
          cssClass: 'action-sheet-cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedRequest.set(null);
  }

  handleImageError(req: UserDormOwnerGetRes) {
    req.PROFILE_IMAGE = '';
    this.requests.set([...this.requests()]);
  }

  handleModalImageError() {
    const req = this.selectedRequest();
    if (req) {
      req.PROFILE_IMAGE = '';
      this.selectedRequest.set({ ...req });
    }
  }

  async approve() {
    const req = this.selectedRequest();
    if (!req) return;

    const alert = await this.alertCtrl.create({
      header: 'อนุมัติคำขอ',
      message: `ยืนยันการอนุมัติคำขอของ ${req.FIRST_NAME || req.USERNAME}?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'อนุมัติ',
          handler: () => {
            this.submitApproval(req.USER_ID, true, 'Approved');
          },
        },
      ],
    });
    await alert.present();
  }

  async reject() {
    const req = this.selectedRequest();
    if (!req) return;

    const alert = await this.alertCtrl.create({
      header: 'เหตุผลที่ปฏิเสธ',
      message: `กรุณาระบุเหตุผลในการปฏิเสธคำขอของ ${
        req.FIRST_NAME || req.USERNAME
      }`,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'อธิบายเหตุผลที่คุณปฏิเสธคำขอนี้...',
        },
      ],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ยืนยันการปฏิเสธ',
          role: 'destructive',
          handler: (data) => {
            if (!data.reason || !data.reason.trim()) {
              this.showToast('กรุณาระบุเหตุผลที่ปฏิเสธ', 'warning');
              return false;
            }
            this.submitApproval(req.USER_ID, false, data.reason.trim());
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  submitApproval(userId: number, status: boolean, msg: string) {
    this.isLoading.set(true);
    this.userSv.approveDormOwnerRequest(userId, status, msg).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.showToast(
          status ? 'Request approved!' : 'Request rejected',
          'success'
        );
        this.closeModal();
        this.fetchRequests();
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error handling request', err);
        this.showToast('Action failed: ' + err.message, 'danger');
      },
    });
  }

  openSocial(handle: string | undefined | null, platform: string) {
    if (!handle) return;

    let url = '';
    switch (platform) {
      case 'facebook':
        url = handle.includes('http') ? handle : `https://${handle}`;
        break;
      case 'instagram':
        url = handle.includes('http') ? handle : `https://${handle}`;
        break;
      case 'telegram':
        url = handle.includes('http')
          ? handle
          : `https://t.me/+${handle.replace(/[^0-9]/g, '')}`;
        break;
      case 'line':
        url = handle.includes('http')
          ? handle
          : `https://line.me/ti/p/~${handle}`;
        break;
      case 'x':
        url = handle.includes('http') ? handle : `https://${handle}`;
        break;
    }

    if (url) {
      window.open(url, '_blank');
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      mode: 'ios',
    });
    await toast.present();
  }

  goBack() {
    this.navCtrl.back();
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.showScrollBtn.set(scrollTop > 400);
  }
}
