import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const alertCtrl = inject(AlertController);
  const navCtrl = inject(NavController);
  let token = localStorage.getItem('token');

  if (token) {
    try {
      const parsed = JSON.parse(token);
      if (typeof parsed === 'string') {
        token = parsed;
      }
    } catch (e) {
      // Not a JSON string
    }

    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(clonedReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Token expired or invalid
          handleSessionExpired(alertCtrl, navCtrl);
        }
        return throwError(() => error);
      })
    );
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        handleSessionExpired(alertCtrl, navCtrl);
      }
      return throwError(() => error);
    })
  );
};

async function handleSessionExpired(alertCtrl: AlertController, navCtrl: NavController) {
  // Check if an alert is already presented to avoid multiple popups
  const existingAlert = await alertCtrl.getTop();
  if (existingAlert) return;

  localStorage.clear();
  
  const alert = await alertCtrl.create({
    header: 'เซสชั่นหมดอายุ',
    message: 'กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อใช้งานต่อ',
    buttons: [{
      text: 'ตกลง',
      handler: () => {
        navCtrl.navigateRoot('/login');
      }
    }],
    backdropDismiss: false
  });

  await alert.present();
}
