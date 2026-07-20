import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonToast,
  IonText,
  NavController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  person,
  key,
  arrowBackOutline,
  arrowForwardCircleOutline,
  call,
  arrowBackCircleOutline,
  mail,
} from 'ionicons/icons';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserRegPostReq, UserRegPostReqForm } from 'src/app/model/user.model';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { delay, finalize, take, timeout, timer } from 'rxjs';
import { LoadingUIComponent } from '../main-layout/components/loading-ui/loading-ui.component';
import { OTPVerifyComponent } from '../main-layout/components/otp-verify/otp-verify.component';
import { extractErrorMessage } from 'src/app/utils/error.util';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonText,
    IonToast,
    IonIcon,
    IonButton,
    IonContent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    IonInput,
    IonInputPasswordToggle,
    OTPVerifyComponent,
    LoadingUIComponent,
  ],
})
export class RegisterPage {
  isOpenPopUpVerify = signal<boolean>(false);
  registerForm: FormGroup;
  errMsg = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  succMsg = signal<string | null>(null);
  uDataAfterNL = signal<UserRegPostReq | null>(null);
  nextBtnHidden = signal<boolean>(false);
  roleParam = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private userSv: UserServices,
    private router: Router,
    private navCtrl: NavController,
    private route: ActivatedRoute,
    public authSv: AuthenService
  ) {
    this.route.queryParams.subscribe((params) => {
      if (params['role']) {
        this.roleParam.set(params['role']);
      }
    });

    addIcons({
      person,
      call,
      arrowForwardCircleOutline,
      arrowBackCircleOutline,
      mail,
    });

    this.registerForm = this.fb.group<UserRegPostReqForm>(
      {
        username: this.fb.nonNullable.control('', {
          validators: [Validators.required],
        }),
        email: this.fb.nonNullable.control('', {
          validators: [Validators.email, Validators.required],
        }),
        password: this.fb.nonNullable.control('', {
          validators: [Validators.required, Validators.minLength(8)],
        }),
        confirmPassword: this.fb.nonNullable.control('', {
          validators: [Validators.required, Validators.minLength(8)],
        }),
        phone: this.fb.nonNullable.control('', {
          validators: [Validators.required, Validators.pattern(/^0[0-9]{9}$/)],
        }),
      },
      {
        validators: passwordMatchValidator,
      }
    );
  }

  onSubmit() {
    this.errMsg.set(null);
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();

      if (this.registerForm.errors?.['passwordMismatch']) {
        this.errMsg.set('รหัสผ่านไม่ตรงกัน');
        return;
      }

      this.errMsg.set('ข้อมูลไม่ถูกต้อง');
      return;
    }

    this.isLoading.set(true);
    this.registerForm.disable();

    const dataForm: UserRegPostReq = this.registerForm.getRawValue();

    if (dataForm) {
      this.userSv
        .register(dataForm)
        .pipe(
          timeout(5000),
          take(1),
          finalize(() => {
            this.isLoading.set(false);
            return this.registerForm.enable();
          })
        )
        .subscribe({
          next: (res) => {
            sessionStorage.setItem('reg1', JSON.stringify(res));
            this.uDataAfterNL.set(res);
            const isAdminCreating = this.authSv.currentUserValue?.role === 3;
            if (isAdminCreating) {
              res.role = this.roleParam() || 'member';
              this.getVerify(true);
            } else {
              this.openOTP_popup();
            }
          },
          error: (err: any) => {
            if (err.name === 'TimeoutError') {
              this.errMsg.set(
                'การเชื่อมต่อล้มเหลว โปรดตรวจเช็คการเชื่อมต่ออินเทอร์เน็ต'
              );
              return;
            }
            this.errMsg.set(extractErrorMessage(err));
          },
        });
    }
  }

  closeOTP_popup() {
    this.isOpenPopUpVerify.set(false);
  }

  openOTP_popup() {
    this.isOpenPopUpVerify.set(true);
  }

  getVerify(status: boolean) {
    this.isLoading.set(true);
    this.registerForm.disable();
    this.nextBtnHidden.set(true);
    if (this.uDataAfterNL()) {
      const isAdminCreating = this.authSv.currentUserValue?.role === 3;
      this.userSv
        .register2(this.uDataAfterNL()!, status, isAdminCreating)
        .pipe(
          take(1),
          finalize(() => {
            this.isLoading.set(false);
          })
        )
        .subscribe({
          next: (res: any) => {
            this.succMsg.set('ลงทะเบียนสำเร็จ');
            sessionStorage.removeItem('reg1');

            timer(2000).subscribe(() => {
              if (isAdminCreating) {
                if (this.roleParam() === 'owner' && res?.user_id) {
                  return this.router.navigate(['/owner-register', res.user_id]);
                }
                return this.router.navigateByUrl('/member-management');
              } else {
                return this.router.navigateByUrl('/login');
              }
            });
          },
          error: (err: any) => {
            this.errMsg.set(extractErrorMessage(err));
          },
        });
    }
  }
  backBtnClicked() {
    this.navCtrl.back();
  }

  ionViewWillEnter() {
    this.registerForm.reset();
    this.registerForm.enable();

    this.errMsg.set(null);
    this.succMsg.set(null);
    this.isLoading.set(false);
    this.isOpenPopUpVerify.set(false);
    this.nextBtnHidden.set(false);
    this.uDataAfterNL.set(null);
  }
}

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};
