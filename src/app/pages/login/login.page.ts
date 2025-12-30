import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonInput,
  IonImg,
  IonButton,
  IonInputPasswordToggle,
  IonIcon,
  IonToast,
} from '@ionic/angular/standalone';
import { Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowForwardCircleOutline, person } from 'ionicons/icons';
import { UserServices } from 'src/app/services/userServices';
import { finalize, Subscription, timeout } from 'rxjs';
import { LoadingUIComponent } from 'src/app/components/loading-ui/loading-ui.component';
import { AuthenService } from 'src/app/services/authenService';
import { UserDataGetRes } from 'src/app/model/responses/user_data_get_res';
import { extractErrorMessage } from '../register/register.page';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonToast,
    IonIcon,
    IonButton,
    IonInput,
    IonContent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonInputPasswordToggle,
    RouterLink,
    LoadingUIComponent,
  ],
})

export class LoginPage {
  loginForm: FormGroup;
  isLoading = signal(false);
  errMsg = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private userSv: UserServices,
    private authSv: AuthenService,
    private router: Router
  ) {
    addIcons({ person, arrowForwardCircleOutline });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.loginForm.disable();
    this.isLoading.set(true);
    this.errMsg.set(null);

    this.userSv.login(this.loginForm.getRawValue())
      .pipe(
        timeout(5000),
        finalize(() => {
          this.isLoading.set(false);
          this.loginForm.enable();
        })
      )
      .subscribe({
        next: (u: UserDataGetRes) => {
          localStorage.setItem('user', JSON.stringify(u));
          this.authSv.setLoggedInUser(u);
          this.router.navigateByUrl('/');
        },
        error: (err) => {
          if (err.name === 'TimeoutError') {
            this.errMsg.set('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
          }this.errMsg.set(extractErrorMessage(err))
        }
      });
  }
}