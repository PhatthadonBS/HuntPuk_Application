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
import { Router, RouterLink } from '@angular/router';
import { UserRegPostReqForm } from 'src/app/model/formModel/user_reg_post_req_form';
import { UserRegPostReq } from 'src/app/model/requests/user_reg_post_req';
import { UserServices } from 'src/app/services/userServices';
import { delay, finalize, take, timeout, timer } from 'rxjs';
import { OTPVerifyComponent } from 'src/app/components/otp-verify/otp-verify.component';
import { LoadingUIComponent } from 'src/app/components/loading-ui/loading-ui.component';

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
  nextBtnHidden = signal<boolean>(false)
  constructor(
    private fb: FormBuilder,
    private userSv: UserServices,
    private router: Router
  ) {
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
            this.openOTP_popup();
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
    this.nextBtnHidden.set(true)
    if (this.uDataAfterNL()) {
      this.userSv
        .register2(this.uDataAfterNL()!, status, false)
        .pipe(
          take(1),
          finalize(() => {
            this.isLoading.set(false);
          })
        )
        .subscribe({
          next: () => {
            this.succMsg.set('ลงทะเบียนสำเร็จ');
            sessionStorage.removeItem('reg1');

            timer(2000).subscribe(() => {
              return this.router.navigateByUrl('/login');
            });
          },
          error: (err: any) => {
            this.errMsg.set(extractErrorMessage(err));
          },
        });
    }
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

export function extractErrorMessage(err: any): string {
  if (!err) return 'เกิดข้อผิดพลาด';

  if (typeof err?.error === 'string') {
    return err?.error;
  }

  if (err?.error?.message) {
    return err?.error?.message;
  }

  if (err?.message) {
    return err?.message;
  }

  return 'เกิดข้อผิดพลาด !!!';
}
