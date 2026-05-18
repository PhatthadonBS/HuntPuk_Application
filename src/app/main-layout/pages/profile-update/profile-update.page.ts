import { Component, OnInit, signal } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { UserLoggedInPostRes, UserUpdatePostReqForm } from 'src/app/model/user.model';
import { timer } from 'rxjs';
import { NavController } from '@ionic/angular';
import { extractErrorMessage } from 'src/app/utils/error.util';
import { ActivatedRoute } from '@angular/router';

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
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class ProfileUpdatePage implements OnInit {
  user = signal<UserLoggedInPostRes | null>(null);
  updateForm!: FormGroup;
  errMsg = signal<string | null>(null);
  succMsg = signal<string | null>(null);
  user_id = signal<number | null>(null)
  constructor(
    private userSv: UserServices,
    private authSv: AuthenService,
    private fb: FormBuilder,
    private navCtrl: NavController,
    private actRouter: ActivatedRoute
  ) {}

  ngOnInit() {
    const uid_param = this.actRouter.snapshot.paramMap.get('user_id')
    this.user_id.set(Number(uid_param)) 
    this.authSv.user$.subscribe({
      next: (u) => {
          this.user.set(u);
      },error: (err) => {
        this.errMsg.set(extractErrorMessage(err))
        timer(3000).subscribe(()=> {
          return this.navCtrl.navigateRoot('/');
        })
      }
    });
    
    this.updateForm = this.fb.group<UserUpdatePostReqForm>({
      username: this.fb.control(this.user()!.user.username),
      phone_number: this.fb.control(this.user()!.user.phone),
    });
  }

  update() {
    const formData = this.updateForm.getRawValue();
    this.userSv.profileUpdate(this.user()!.user.id, formData).subscribe({
      next: () => {
        this.errMsg.set(null);
        this.succMsg.set('แก้ไขข้อมูลเสร็จสิ้น');
        timer(3000).subscribe(() => {
          return this.navCtrl.navigateRoot(['/profile', this.user()!.user.id]);
        });
      },
      error: (err: any) => {
        this.succMsg.set(null);
        return this.errMsg.set(extractErrorMessage(err));
      },
    });
  }
}
