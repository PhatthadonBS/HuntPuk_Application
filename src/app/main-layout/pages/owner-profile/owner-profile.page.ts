import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonButton,
  IonBackButton,
  IonButtons,
  IonToast,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackCircleOutline,
  call,
  callOutline,
  create,
  createOutline,
  ellipsisHorizontalOutline,
  mail,
  mailOutline,
  person,
  personOutline,
  personCircleOutline,
  trashBin,
  trashOutline,
  lockClosedOutline,
  businessOutline,
} from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { UserServices } from 'src/app/services/userServices';
import { timer, finalize } from 'rxjs';
import { UserAllGetRes } from 'src/app/model/user.model';
import { AuthenService } from 'src/app/services/authenService';
import { extractErrorMessage } from 'src/app/utils/error.util';
import { NavController, AlertController } from '@ionic/angular';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';

@Component({
  selector: 'app-owner-profile',
  templateUrl: './owner-profile.page.html',
  styleUrls: ['./owner-profile.page.scss'],
  standalone: true,
  imports: [
    IonToast,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    CommonModule,
    FormsModule,
    IonButton,
    LoadingUIComponent,
  ],
})
export class OwnerProfilePage {
  user = signal<UserAllGetRes | null>(null);
  errMsg = signal<string | null>(null);
  succMsg = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  isAdmin = signal<boolean>(false);
  isOwnProfile = signal<boolean>(false);
  adminView = signal<boolean>(false);

  constructor(
    private userSv: UserServices,
    private authSv: AuthenService,
    private router: Router,
    private actRouter: ActivatedRoute,
    private navCtrl: NavController,
    private alertController: AlertController
  ) {
    addIcons({
      arrowBackCircleOutline,
      person,
      personOutline,
      personCircleOutline,
      createOutline,
      mail,
      mailOutline,
      call,
      callOutline,
      trashBin,
      trashOutline,
      create,
      ellipsisHorizontalOutline,
      lockClosedOutline,
      businessOutline,
    });
  }

  ionViewWillEnter() {
    this.checkRoles();

    // Check both query param and route param for flexibility
    let user_id = this.actRouter.snapshot.queryParamMap.get('user_id');
    if (!user_id) {
      user_id = this.actRouter.snapshot.paramMap.get('user_id');
    }

    // If no user_id is provided but we are an owner viewing our own profile
    if (!user_id && this.authSv.currentUserValue?.id) {
      user_id = this.authSv.currentUserValue.id.toString();
    }

    if (user_id) {
      this.fetchOwnerData(Number(user_id));
    } else {
      this.errMsg.set('not found user id');
      timer(3000).subscribe(() => {
        return this.router.navigateByUrl('/', { replaceUrl: true });
      });
    }

    if (this.actRouter.snapshot.queryParamMap.get('adminView') === 'true') {
      this.adminView.set(true);
    }
  }

  checkRoles() {
    const currentUser = this.authSv.currentUserValue;
    if (currentUser) {
      this.isAdmin.set(currentUser.role === 3); // 3 = Admin
    }
  }

  fetchOwnerData(uid: number) {
    this.isLoading.set(true);

    const currentUser = this.authSv.currentUserValue;
    this.isOwnProfile.set(currentUser?.id == uid);

    this.userSv
      .getUserByID(uid)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (u: any) => {
          this.user.set(u);
        },
        error: (err: any) => {
          this.errMsg.set(extractErrorMessage(err));
          timer(3000).subscribe(() => {
            return this.navCtrl.navigateBack('/member-management');
          });
        },
      });
  }

  handleImageError() {
    if (this.user()) {
      const updatedUser = { ...this.user()!, PROFILE_IMAGE: undefined };
      this.user.set(updatedUser as any);
    }
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'ยืนยันการออกจากระบบ',
      message: 'คุณต้องการออกจากระบบใช่หรือไม่?',
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'ออกจากระบบ',
          handler: () => {
            this.authSv.logoutUser();
          },
        },
      ],
    });
    await alert.present();
  }

  profileUpdate() {
    const userId = this.user()?.USER_ID;
    if (userId) {
      return this.router.navigate(['/owner-profile-update', userId]);
    }
    return;
  }

  resetPasswd() {
    return this.router.navigate(['/forgotPasswd']);
  }

  async banUser() {
    const user = this.user();
    if (!user) return;

    const alert = await this.alertController.create({
      header: 'Confirm Ban',
      message: `Are you sure you want to ban ${
        user.FIRST_NAME || user.USERNAME
      }?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Ban',
          role: 'destructive',
          handler: () => {
            this.isLoading.set(true);
            this.userSv
              .banAccount(user.USER_ID)
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.succMsg.set('User has been banned');
                  this.fetchOwnerData(user.USER_ID);
                },
                error: (err) =>
                  this.errMsg.set(
                    'Failed to ban user: ' + extractErrorMessage(err)
                  ),
              });
          },
        },
      ],
    });
    await alert.present();
  }

  async unbanUser() {
    const user = this.user();
    if (!user) return;

    const alert = await this.alertController.create({
      header: 'Confirm Unban',
      message: `Are you sure you want to lift the ban for ${
        user.FIRST_NAME || user.USERNAME
      }?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Lift Ban',
          handler: () => {
            this.isLoading.set(true);
            this.userSv
              .unbanAccount(user.USER_ID)
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.succMsg.set('User has been unbanned');
                  this.fetchOwnerData(user.USER_ID);
                },
                error: (err) =>
                  this.errMsg.set(
                    'Failed to unban user: ' + extractErrorMessage(err)
                  ),
              });
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'ยืนยันการลบบัญชี',
      message: 'พิมพ์คำว่า "DELETE" เพื่อยืนยันการลบบัญชีของคุณ',
      inputs: [
        {
          name: 'confirmText',
          type: 'text',
          placeholder: 'พิมพ์ DELETE',
        },
      ],
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'ลบบัญชี',
          cssClass: 'danger',
          handler: (data) => {
            if (data.confirmText === 'DELETE') {
              const uid = this.user()?.USER_ID;
              if (uid) {
                this.isLoading.set(true);
                this.userSv
                  .deleteAccount(uid)
                  .pipe(finalize(() => this.isLoading.set(false)))
                  .subscribe({
                    next: () => {
                      this.authSv.logoutUser();
                    },
                    error: (err) => {
                      this.errMsg.set(extractErrorMessage(err));
                    },
                  });
              }
              return true;
            } else {
              this.errMsg.set(
                'คำยืนยันไม่ถูกต้อง กรุณาพิมพ์ DELETE เพื่อยืนยัน'
              );
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  goBack() {
    if (this.isAdmin()) {
      return this.navCtrl.back();
    }
    return this.navCtrl.navigateForward(['/']);
  }
}
