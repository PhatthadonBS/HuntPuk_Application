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
  ],
})
export class OwnerRequestsPage implements OnInit {
  requests = signal<UserDormOwnerGetRes[]>([]);
  isLoading = signal<boolean>(false);
  selectedRequest = signal<UserDormOwnerGetRes | null>(null);
  isModalOpen = signal<boolean>(false);

  // Management State
  rejectReason = signal<string>('');
  showRejectInput = signal<boolean>(false);

  constructor(
    private userSv: UserServices,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
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
    });
  }

  ngOnInit() {
    this.fetchRequests();
  }

  fetchRequests() {
    this.isLoading.set(true);
    this.userSv
      .getPendingOwnerRequests()
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

  openRequest(req: UserDormOwnerGetRes) {
    this.selectedRequest.set(req);
    this.rejectReason.set('');
    this.showRejectInput.set(false);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedRequest.set(null);
  }

  async approve() {
    const req = this.selectedRequest();
    if (!req) return;

    const alert = await this.alertCtrl.create({
      header: 'Approve Request',
      message: `Confirm approval for ${req.FIRST_NAME} ${req.LAST_NAME}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Approve',
          handler: () => {
            this.submitApproval(req.USER_ID, true, 'Approved');
          },
        },
      ],
    });
    await alert.present();
  }

  async reject() {
    if (!this.showRejectInput()) {
      this.showRejectInput.set(true);
      return;
    }

    if (!this.rejectReason().trim()) {
      this.showToast('Please provide a reason for rejection', 'warning');
      return;
    }

    const req = this.selectedRequest();
    if (!req) return;

    const alert = await this.alertCtrl.create({
      header: 'Reject Request',
      message: `Are you sure you want to reject this request?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          role: 'destructive',
          handler: () => {
            this.submitApproval(req.USER_ID, false, this.rejectReason());
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
        url = handle.includes('http') ? handle : `https://t.me/+${handle.replace(/[^0-9]/g, '')}`;
        break;
      case 'line':
        url = handle.includes('http') ? handle : `https://line.me/ti/p/~${handle}`;
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
}
