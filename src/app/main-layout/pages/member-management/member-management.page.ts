import { Component, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButtons, 
  IonBackButton, 
  IonSearchbar, 
  IonButton, 
  IonIcon, 
  IonSegment, 
  IonSegmentButton, 
  IonLabel, 
  IonList, 
  IonItem, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonBadge, 
  IonFab, 
  IonFabButton, 
  AlertController, 
  ToastController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  searchOutline, 
  createOutline, 
  banOutline, 
  checkmarkCircleOutline,
  arrowUpOutline,
  personCircleOutline,
  businessOutline,
  shieldCheckmarkOutline,
  trashOutline
} from 'ionicons/icons';
import { UserServices } from 'src/app/services/userServices';
import { UserAllGetRes } from 'src/app/model/user.model';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-member-management',
  templateUrl: './member-management.page.html',
  styleUrls: ['./member-management.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButtons, 
    IonBackButton, 
    IonSearchbar, 
    IonButton, 
    IonIcon, 
    IonSegment, 
    IonSegmentButton, 
    IonLabel, 
    IonList, 
    IonItem, 
    IonCard, 
    IonCardHeader, 
    IonCardTitle, 
    IonCardContent, 
    IonBadge, 
    IonFab, 
    IonFabButton, 
    CommonModule, 
    FormsModule
  ]
})
export class MemberManagementPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;

  members = signal<UserAllGetRes[]>([]);
  owners = signal<UserAllGetRes[]>([]);
  selectedTab = signal<'member' | 'owner'>('member');
  searchText = signal<string>('');
  isLoading = signal<boolean>(false);

  filteredUsers = computed(() => {
    const list = this.selectedTab() === 'member' ? this.members() : this.owners();
    const search = this.searchText().toLowerCase().trim();
    
    if (!search) return list;

    return list.filter(u => {
      if (this.selectedTab() === 'member') {
        return u.USERNAME.toLowerCase().includes(search);
      } else {
        const fullName = `${u.FIRST_NAME || ''} ${u.LAST_NAME || ''}`.toLowerCase();
        return fullName.includes(search) || u.USERNAME.toLowerCase().includes(search);
      }
    });
  });

  constructor(
    private userSv: UserServices,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      searchOutline,
      createOutline,
      banOutline,
      arrowUpOutline,
      personCircleOutline,
      businessOutline,
      checkmarkCircleOutline,
      shieldCheckmarkOutline,
      trashOutline
    });
  }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.isLoading.set(true);
    this.userSv.getMembers().subscribe({
      next: (data) => this.members.set(data),
      error: (err) => console.error('Error fetching members', err)
    });

    this.userSv.getDormOwners().pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (data) => this.owners.set(data),
      error: (err) => console.error('Error fetching owners', err)
    });
  }

  onTabChange(event: any) {
    this.selectedTab.set(event.detail.value);
  }

  onSearch(event: any) {
    this.searchText.set(event.detail.value || '');
  }

  scrollToTop() {
    this.content.scrollToTop(500);
  }

  goToDetail(user: UserAllGetRes) {
    if (user.ROLE_TYPE_ID === 1) {
      this.router.navigate(['/profile', user.USER_ID]);
    } else {
      this.router.navigate(['/owner-profile', user.USER_ID]);
    }
  }

  editUser(event: Event, user: UserAllGetRes) {
    event.stopPropagation();
    if (user.ROLE_TYPE_ID === 1) {
      this.router.navigate(['/profile-update', user.USER_ID]);
    } else {
      this.router.navigate(['/owner-profile-update', user.USER_ID]);
    }
  }

  async banUser(event: Event, user: UserAllGetRes) {
    event.stopPropagation();
    
    const alert = await this.alertCtrl.create({
      header: 'Confirm Ban',
      message: `Are you sure you want to ban ${this.selectedTab() === 'member' ? user.USERNAME : user.FIRST_NAME + ' ' + user.LAST_NAME}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Ban',
          role: 'destructive',
          handler: () => {
            this.userSv.banAccount(user.USER_ID).subscribe({
              next: () => {
                this.showToast('User has been banned');
                this.fetchData();
              },
              error: (err) => this.showToast('Failed to ban user: ' + err.message)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async unbanUser(event: Event, user: UserAllGetRes) {
    event.stopPropagation();
    
    const alert = await this.alertCtrl.create({
      header: 'Confirm Unban',
      message: `Are you sure you want to lift the ban for ${this.selectedTab() === 'member' ? user.USERNAME : user.FIRST_NAME + ' ' + user.LAST_NAME}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Lift Ban',
          handler: () => {
            this.userSv.unbanAccount(user.USER_ID).subscribe({
              next: () => {
                this.showToast('User has been unbanned');
                this.fetchData();
              },
              error: (err) => this.showToast('Failed to unban user: ' + err.message)
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async hardDeleteUser(event: Event, user: UserAllGetRes) {
    event.stopPropagation();
    
    const alert = await this.alertCtrl.create({
      header: 'Confirm Hard Delete',
      message: `Are you absolutely sure you want to PERMANENTLY delete ${this.selectedTab() === 'member' ? user.USERNAME : user.FIRST_NAME + ' ' + user.LAST_NAME}? This action cannot be undone and will erase all associated data.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete Permanently',
          role: 'destructive',
          handler: () => {
            this.userSv.hardDeleteAccount(user.USER_ID).subscribe({
              next: () => {
                this.showToast('User has been permanently deleted');
                this.fetchData();
              },
              error: (err) => {
                const msg = err.error?.message || err.message;
                this.showToast('Failed to delete: ' + msg);
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  getStatusColor(status: number) {
    switch (status) {
      case 0: return 'success';
      case 1: return 'warning';
      case 2: return 'danger';
      default: return 'medium';
    }
  }

  getStatusText(status: number) {
    switch (status) {
      case 0: return 'Active';
      case 1: return 'Inactive';
      case 2: return 'Banned';
      default: return 'Unknown';
    }
  }
}
