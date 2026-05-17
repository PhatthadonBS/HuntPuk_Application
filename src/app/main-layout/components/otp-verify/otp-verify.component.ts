import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonInput,
  IonInputOtp,
  IonText,
  IonToast,
} from '@ionic/angular/standalone';
import { UserOtpVerifyPostRes, UserRegPostReq } from 'src/app/model/user.model';
import { AuthenService } from 'src/app/services/authenService';
import { addIcons } from 'ionicons';
import { mail, personOutline } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap, take, tap, timeout } from 'rxjs';
import { UserServices } from 'src/app/services/userServices';
import { LoadingUIComponent } from '../loading-ui/loading-ui.component';
import { extractErrorMessage } from 'src/app/register/register.page';

@Component({
  selector: 'app-otp-verify',
  templateUrl: './otp-verify.component.html',
  styleUrls: ['./otp-verify.component.scss'],
  standalone: true,
  imports: [
    IonToast,
    IonText,
    IonInput,
    IonIcon,
    IonButton,
    IonContent,
    IonInputOtp,
    CommonModule,
    ReactiveFormsModule,
    LoadingUIComponent,
  ],
})
export class OTPVerifyComponent implements OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() resVerifyStatus = new EventEmitter<boolean>();

  localData: string | null = sessionStorage.getItem('reg1')
    ? sessionStorage.getItem('reg1')
    : null;

  uData: UserRegPostReq | null = null;
  errMsg = signal<string | null>(null);
  countdown = signal<number>(0);
  isCounting = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  private timerId: any;

  constructor(
    private authSv: AuthenService,
    private router: Router,
    private userSv: UserServices
  ) {
    
    if (this.localData) {
      this.uData = JSON.parse(this.localData);
      if (this.uData) {
        this.emailCtl.setValue(this.uData.email);
      }
    }

    addIcons({ personOutline, mail });
  }

  emailCtl = new FormControl('', [Validators.email, Validators.required]);
  otpCtl = new FormControl('', [
    Validators.required,
    Validators.maxLength(6),
    Validators.minLength(6),
  ]);

  closePopup() {
    this.close.emit();
  }

  resVerify(status: boolean){
    this.resVerifyStatus.emit(status)
  }

  sendOtp() {
    if (this.emailCtl.invalid) {
      this.emailCtl.markAsTouched();
      return;
    }

    if (this.isCounting()) return;
    this.emailCtl.disable();
    const email = this.emailCtl.value;
    this.startCountdown(60);
    this.authSv.reqOTP(email!).subscribe();
  }

  confirm() {
    const email = this.emailCtl.value;
    const otp = this.otpCtl.value;

    if (!email || !otp || !this.uData) return;

    this.isLoading.set(true);
    this.errMsg.set(null);

    this.authSv
      .verifyOTP(email, otp)
      .pipe(
        take(1),
        tap((res: UserOtpVerifyPostRes) => {
          if (!res.status) {
            throw new Error('OTP ไม่ถูกต้อง');
          }
        }),
        timeout(5000),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res: UserOtpVerifyPostRes) => {
          this.resVerify(res.status)
          this.closePopup()
        },
        error: (err) => {
          this.errMsg.set(extractErrorMessage(err));
        },
      });
  }

  startCountdown(seconds: number) {
    this.countdown.set(seconds);
    this.isCounting.set(true);

    this.timerId = setInterval(() => {
      const value = this.countdown() - 1;
      this.countdown.set(value);

      if (value <= 0) {
        this.stopCountdown();
      }
    }, 1000);
  }

  stopCountdown() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isCounting.set(false);
    this.countdown.set(0);

    this.emailCtl.enable();
  }

  ngOnDestroy() {
    this.stopCountdown();
  }
  
  resetState() {
  this.errMsg.set(null);
  this.otpCtl.reset();
  this.isCounting.set(false);
  this.countdown.set(0);
  this.emailCtl.enable();
}

}
