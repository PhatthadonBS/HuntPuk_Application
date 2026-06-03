import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonButton,
  IonLabel,
  IonToast,
  IonList,
  IonItem,
  IonInput,
  IonButtons,
  IonBackButton
} from '@ionic/angular/standalone';
import { UserServices } from 'src/app/services/userServices';
import { UserDataGetRes, UserUpdatePostReqForm } from 'src/app/model/user.model';
import { timer, finalize } from 'rxjs';
import { NavController, AlertController } from '@ionic/angular';
import { extractErrorMessage } from 'src/app/utils/error.util';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { person, personOutline, callOutline, arrowBackCircleOutline } from 'ionicons/icons';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';

@Component({
  selector: 'app-profile-update',
  templateUrl: './profile-update.page.html',
  styleUrls: ['./profile-update.page.scss'],
  standalone: true,
  imports: [
    IonToast,
    IonLabel,
    IonButton,
    IonIcon,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonInput,
    IonButtons,
    IonBackButton,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoadingUIComponent
  ],
})
export class ProfileUpdatePage {
  user = signal<UserDataGetRes | null>(null);
  updateForm!: FormGroup;
  errMsg = signal<string | null>(null);
  succMsg = signal<string | null>(null);
  user_id = signal<number | null>(null);
  isLoading = signal<boolean>(false);

  constructor(
    private userSv: UserServices,
    private fb: FormBuilder,
    private navCtrl: NavController,
    private actRouter: ActivatedRoute,
    private alertController: AlertController
  ) {
    addIcons({ person, personOutline, callOutline, arrowBackCircleOutline });
    this.updateForm = this.fb.group<UserUpdatePostReqForm>({
      username: this.fb.control(null),
      phone_number: this.fb.control(null),
    });
  }

  ionViewWillEnter() {
    const uid_param = this.actRouter.snapshot.paramMap.get('user_id');
    this.user_id.set(Number(uid_param)); 
    
    this.isLoading.set(true);
    this.userSv.getUserByID(Number(uid_param)).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (u) => {
        this.user.set(u);
        this.updateForm.patchValue({
          username: u.USERNAME,
          phone_number: u.PHONE_NUMBER
        });
      },
      error: (err) => {
        this.errMsg.set(extractErrorMessage(err));
        timer(3000).subscribe(() => {
          this.navCtrl.navigateRoot('/');
        });
      }
    });
  }

  goBack() {
    this.navCtrl.back();
  }

  async confirmUpdate() {
    if (this.updateForm.invalid) return;

    const alert = await this.alertController.create({
      header: 'ยืนยันการบันทึก',
      message: 'คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลใช่หรือไม่?',
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'ยืนยัน',
          handler: () => {
            this.update();
          }
        }
      ]
    });

    await alert.present();
  }

  update() {
    if (this.updateForm.invalid) return;
    
    const formData = this.updateForm.getRawValue();
    
    this.isLoading.set(true);
    this.userSv.profileUpdate(this.user()!.USER_ID, formData).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => {
        this.errMsg.set(null);
        this.succMsg.set('แก้ไขข้อมูลเสร็จสิ้น');
        timer(1500).subscribe(() => {
          this.navCtrl.navigateRoot(['/profile', this.user()!.USER_ID]);
        });
      },
      error: (err: any) => {
        this.succMsg.set(null);
        this.errMsg.set(extractErrorMessage(err));
      },
    });
  }
}
