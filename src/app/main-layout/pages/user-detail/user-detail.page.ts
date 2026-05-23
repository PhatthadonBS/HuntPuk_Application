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
  lockClosedOutline
} from 'ionicons/icons';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { UserServices } from 'src/app/services/userServices';
import { Observable, timer } from 'rxjs';
import { UserDataGetRes, UserLoggedInPostRes } from 'src/app/model/user.model';
import { AuthenService } from 'src/app/services/authenService';
import { extractErrorMessage } from 'src/app/utils/error.util';
import { NavController, AlertController } from '@ionic/angular';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';

@Component({
  selector: 'app-user-detail',
  templateUrl: './user-detail.page.html',
  styleUrls: ['./user-detail.page.scss'],
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
    RouterLink,
    IonButton
  ], 
})
export class UserDetailPage{
  user = signal<UserDataGetRes | null>(null);
  errMsg = signal<string | null>(null);
  succMsg = signal<string | null>(null);

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
      lockClosedOutline
    });
  }

  ionViewWillEnter() {
    const user_id = this.actRouter.snapshot.paramMap.get('user_id');
    if (user_id) {
      this.userSv.getUserByID(Number(user_id)).subscribe({
        next: (u) => {
          this.user.set(u);
        },
        error: (err: any) => {
          this.errMsg.set(extractErrorMessage(err));

          timer(3000).subscribe(() => {
            return this.navCtrl.navigateRoot('/');
          });
        },
      });
    } else {
      this.errMsg.set('not found user id');
      timer(3000).subscribe(() => {
        return this.router.navigateByUrl('/', { replaceUrl: true });
      });
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
          cssClass: 'secondary'
        },
        {
          text: 'ออกจากระบบ',
          handler: () => {
            this.authSv.logoutUser();
          }
        }
      ]
    });

    await alert.present();
  }

  profileUpdate() {
    return this.router.navigate(['/profile-update', this.user()?.USER_ID]);
  }

  resetPasswd() {
    return this.router.navigate(['/forgotPasswd']);
  }

  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'ยืนยันการลบบัญชี',
      message: 'พิมพ์คำว่า "DELETE" เพื่อยืนยันการลบบัญชีของคุณ',
      inputs: [
        {
          name: 'confirmText',
          type: 'text',
          placeholder: 'พิมพ์ DELETE'
        }
      ],
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'ลบบัญชี',
          cssClass: 'danger',
          handler: (data) => {
            if (data.confirmText === 'DELETE') {
              const uid = this.user()?.USER_ID;
              if (uid) {
                this.userSv.deleteAccount(uid).subscribe({
                  next: () => {
                    this.authSv.logoutUser();
                  },
                  error: (err) => {
                    this.errMsg.set(extractErrorMessage(err));
                  }
                });
              }
              return true;
            } else {
              this.errMsg.set('คำยืนยันไม่ถูกต้อง กรุณาพิมพ์ DELETE เพื่อยืนยัน');
              return false; // Prevents the alert from closing if typing is wrong
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
