import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonIcon, IonButton, IonInput, IonToast, IonInputPasswordToggle, NavController } from '@ionic/angular/standalone';
import { AuthenService } from 'src/app/services/authenService';
import { UserServices } from 'src/app/services/userServices';
import { Router } from '@angular/router';
import { extractErrorMessage } from 'src/app/utils/error.util';
import { addIcons } from 'ionicons';
import { mailOutline, keyOutline, lockClosedOutline } from 'ionicons/icons';
import { UserOtpVerifyPostRes } from 'src/app/model/user.model';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.page.html',
  styleUrls: ['./forget-password.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, ReactiveFormsModule, IonIcon, IonButton, IonInput, IonToast, IonInputPasswordToggle]
})
export class ForgetPasswordPage implements OnInit {
  step = signal<number>(1);
  emailForm!: FormGroup;
  otpForm!: FormGroup;
  passwordForm!: FormGroup;
  
  isLoading = signal<boolean>(false);
  errMsg = signal<string | null>(null);
  succMsg = signal<string | null>(null);
  isVerifyingOTP = signal<boolean>(false);

  constructor(
    private fb: FormBuilder,
    private authSv: AuthenService,
    private userSv: UserServices,
    private router: Router,
    private navCtrl: NavController
  ) {
    addIcons({ mailOutline, keyOutline, lockClosedOutline });
  }

  ngOnInit() {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  requestOTP() {
    if (this.emailForm.invalid) return;
    this.isLoading.set(true);
    const email = this.emailForm.value.email;

    this.authSv.reqOTP(email, 'reset').subscribe({
      next: (res) => {
        if (res.success == false) {
          this.errMsg.set('ไม่พบอีเมลนี้ในระบบ');
          this.isLoading.set(false);
          return;
        }
        
        this.succMsg.set('ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว');
        this.step.set(2);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errMsg.set(extractErrorMessage(err));
        this.isLoading.set(false);
      }
    });
  }

  verifyOTP() {
    if (this.otpForm.invalid) return;
    this.isLoading.set(true);
    const email = this.emailForm.value.email;
    const otp = this.otpForm.value.otp;

    this.authSv.verifyOTP(email, otp).subscribe({
      next: (res: UserOtpVerifyPostRes) => {
        if (!res.status) {
          this.errMsg.set(res.msg);
          this.isLoading.set(false);
          return;
        }
        this.isVerifyingOTP.set(res.status);
        this.succMsg.set(res.msg);
        this.step.set(3);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errMsg.set(extractErrorMessage(err));
        this.isLoading.set(false);
      }
    });
  }

  resetPassword() {
    if (this.passwordForm.invalid) return;
    this.isLoading.set(true);
    const email = this.emailForm.value.email;
    const password = this.passwordForm.value.newPassword;
    let verify = this.isVerifyingOTP();
    this.userSv.resetPassword({ email, password, verify }).subscribe({
      next: () => {
        this.succMsg.set('เปลี่ยนรหัสผ่านสำเร็จ');
        this.isLoading.set(false);
        setTimeout(() => {
          this.navCtrl.navigateRoot('/login');
        }, 1500);
      },
      error: (err) => {
        this.errMsg.set(extractErrorMessage(err));
        this.isLoading.set(false);
      }
    });
  }

  goBack() {
    const currentStep = this.step();
    if (currentStep > 1) {
      this.step.set(currentStep - 1);
    } else {
      this.navCtrl.back();
    }
  }
}
