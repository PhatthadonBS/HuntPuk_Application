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
  IonFabButton,
  AlertController,
  ToastController,
  ActionSheetController,
  IonRefresher,
  IonRefresherContent,
  IonFab,
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
  trashOutline,
  settingsOutline,
  closeOutline,
  arrowBackCircleOutline,
  personAddOutline,
  keyOutline,
} from 'ionicons/icons';
import { UserServices } from 'src/app/services/userServices';
import { UserAllGetRes } from 'src/app/model/user.model';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

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
    FormsModule,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class MemberManagementPage implements OnInit {
  @ViewChild(IonContent) content!: IonContent;

  members = signal<UserAllGetRes[]>([]);
  owners = signal<UserAllGetRes[]>([]);
  selectedTab = signal<'member' | 'owner'>('member');
  searchText = signal<string>('');
  isLoading = signal<boolean>(false);
  showScrollBtn = signal<boolean>(false);

  filteredUsers = computed(() => {
    const list =
      this.selectedTab() === 'member' ? this.members() : this.owners();
    const search = this.searchText().toLowerCase().trim();

    if (!search) return list;

    return list.filter((u) => {
      if (this.selectedTab() === 'member') {
        return u.USERNAME.toLowerCase().includes(search);
      } else {
        const fullName = `${u.FIRST_NAME || ''} ${
          u.LAST_NAME || ''
        }`.toLowerCase();
        return (
          fullName.includes(search) || u.USERNAME.toLowerCase().includes(search)
        );
      }
    });
  });

  constructor(
    private userSv: UserServices,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController
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
      trashOutline,
      settingsOutline,
      closeOutline,
      arrowBackCircleOutline,
      personAddOutline,
      keyOutline,
    });
  }

  ngOnInit() {
    this.fetchData();
  }

  handleRefresh(event: any) {
    this.fetchData();
    setTimeout(() => {
      event.target.complete();
    }, 500);
  }

  fetchData() {
    this.isLoading.set(true);

    forkJoin({
      members: this.userSv.getMembers(),
      owners: this.userSv.getDormOwners(),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.members.set(res.members);
          this.owners.set(res.owners);
        },
        error: (err) => console.error('Error fetching users', err),
      });
  }

  onTabChange(event: any) {
    this.selectedTab.set(event.detail.value);
  }

  onSearch(event: any) {
    this.searchText.set(event.detail.value || '');
  }

  onScroll(event: any) {
    this.showScrollBtn.set(event.detail.scrollTop > 400);
  }

  scrollToTop() {
    this.content.scrollToTop(500);
  }

  goToRegister() {
    if (this.selectedTab() === 'member') {
      this.router.navigate(['/register']);
    } else {
      this.router.navigate(['/owner-register']);
    }
  }

  goToDetail(user: UserAllGetRes) {
    if (user.ROLE_TYPE_ID === 1) {
      this.router.navigate(['/profile', user.USER_ID]);
    } else {
      this.router.navigate(['/owner-profile', user.USER_ID]);
    }
  }

  async openManageActionSheet(event: Event, user: UserAllGetRes) {
    event.stopPropagation();

    const isBanned = user.ACCOUNT_STATUS === 2;

    const actionSheet = await this.actionSheetCtrl.create({
      mode: 'md',
      cssClass: 'minimal-action-sheet',
      header: `จัดการ ${
        this.selectedTab() === 'member'
          ? user.USERNAME
          : user.FIRST_NAME + ' ' + user.LAST_NAME
      }`,
      buttons: [
        {
          text: 'แก้ไข',
          icon: 'create-outline',
          handler: () => {
            this.editUser(event, user);
          },
        },
        {
          text: isBanned ? 'ยกเลิกการระงับ' : 'ระงับการใช้งาน',
          icon: isBanned ? 'shield-checkmark-outline' : 'ban-outline',
          role: isBanned ? undefined : 'destructive',
          handler: () => {
            if (isBanned) {
              this.unbanUser(event, user);
            } else {
              this.banUser(event, user);
            }
          },
        },
        {
          text: 'ลบถาวร',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.hardDeleteUser(event, user);
          },
        },
        {
          text: 'เปลี่ยนรหัสผ่าน',
          icon: 'key-outline',
          handler: () => {
            this.router.navigate(['/forgotPasswd'], {
              queryParams: { email: user.EMAIL },
            });
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
      header: 'ยืนยันการระงับ',
      message: `คุณแน่ใจหรือไม่ว่าต้องการระงับการใช้งาน ${
        this.selectedTab() === 'member'
          ? user.USERNAME
          : user.FIRST_NAME + ' ' + user.LAST_NAME
      }?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ระงับ',
          role: 'destructive',
          handler: () => {
            this.userSv.banAccount(user.USER_ID).subscribe({
              next: () => {
                this.showToast('ผู้ใช้งานถูกระงับแล้ว');
                this.fetchData();
              },
              error: (err) =>
                this.showToast('ไม่สามารถระงับผู้ใช้งานได้: ' + err.message),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  async unbanUser(event: Event, user: UserAllGetRes) {
    event.stopPropagation();

    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการยกเลิกระงับ',
      message: `คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการระงับสำหรับ ${
        this.selectedTab() === 'member'
          ? user.USERNAME
          : user.FIRST_NAME + ' ' + user.LAST_NAME
      }?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ยกเลิกระงับ',
          handler: () => {
            this.userSv.unbanAccount(user.USER_ID).subscribe({
              next: () => {
                this.showToast('ยกเลิกการระงับผู้ใช้งานแล้ว');
                this.fetchData();
              },
              error: (err) =>
                this.showToast('ไม่สามารถยกเลิกการระงับได้: ' + err.message),
            });
          },
        },
      ],
    });
    await alert.present();
  }

  async hardDeleteUser(event: Event, user: UserAllGetRes) {
    event.stopPropagation();

    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการลบถาวร',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบ ${
        this.selectedTab() === 'member'
          ? user.USERNAME
          : user.FIRST_NAME + ' ' + user.LAST_NAME
      } อย่างถาวร? การกระทำนี้ไม่สามารถยกเลิกได้และข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบ`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ลบถาวร',
          role: 'destructive',
          handler: () => {
            this.userSv.hardDeleteAccount(user.USER_ID).subscribe({
              next: () => {
                this.showToast('ผู้ใช้งานถูกลบอย่างถาวรแล้ว');
                this.fetchData();
              },
              error: (err) => {
                const msg = err.error?.message || err.message;
                this.showToast('ไม่สามารถลบได้: ' + msg);
              },
            });
          },
        },
      ],
    });
    await alert.present();
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  getStatusColor(status: number) {
    switch (status) {
      case 0:
        return 'success';
      case 1:
        return 'warning';
      case 2:
        return 'danger';
      default:
        return 'medium';
    }
  }

  getStatusText(status: number) {
    switch (status) {
      case 0:
        return 'ใช้งานปกติ';
      case 1:
        return 'ไม่ได้ใช้งาน';
      case 2:
        return 'ถูกระงับ';
      default:
        return 'ไม่ทราบสถานะ';
    }
  }
}
