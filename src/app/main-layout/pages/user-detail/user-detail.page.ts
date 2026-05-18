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
import { NavController } from '@ionic/angular';

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
    IonButton,
  ],
})
export class UserDetailPage implements OnInit {
  user = signal<UserDataGetRes | null>(null);
  errMsg = signal<string | null>(null);
  succMsg = signal<string | null>(null);
  constructor(
    private userSv: UserServices,
    private authSv: AuthenService,
    private router: Router,
    private actRouter: ActivatedRoute,
    private navCtrl: NavController
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

  ngOnInit() {
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

  logout() {
    return this.authSv.logoutUser();
  }

  profileUpdate() {
    return this.router.navigate(['/profile-update', this.user()?.USER_ID]);
  }

  resetPasswd() {
    return this.router.navigate(['/forgotPasswd']);
  }

  deleteAccount() {
    const reCon = confirm('ต้องการลบบัญชีหรือไม่?');

    if (reCon) {
      this.userSv.deleteAccount(this.user()!.USER_ID).subscribe({
        next: () => {
          return this.logout();
        },
      });
    }
    return;
  }
}
