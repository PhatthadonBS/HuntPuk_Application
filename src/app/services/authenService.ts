import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  GuardResult,
  MaybeAsync,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserDataGetRes } from '../model/responses/user_data_get_res';
import { environment } from 'src/environments/environment';
import { UserLoggedInPostRes } from '../model/responses/user_loggedIn_post_res';
import { NavController } from '@ionic/angular';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class AuthenService implements CanActivate {
  constructor(private router: Router, private http: HttpClient, private navCtrl: NavController) {}
  endPoint = environment.ENDPOINT;
  private userState = new BehaviorSubject<UserLoggedInPostRes | null>(
    this.getUserFromToken()
  );
  user$ = this.userState.asObservable();

  private getUserFromToken(): any | null {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        // ถอดรหัส Token ออกมาเป็น Object
        const decodedToken: any = jwtDecode(token);
        console.log( decodedToken);
        // (Option) เช็กว่า Token หมดอายุหรือยัง (exp เป็น Unix Timestamp)
        const currentTime = Math.floor(Date.now() / 1000);
        if (decodedToken.exp < currentTime) {
          console.log('Token expired!');
          this.logoutUser();
          return null;
        }

        return decodedToken; 
      } catch (e) {
        return null; // ถ้า Token พังหรือถอดรหัสไม่ได้
      }
    }
    return null;
  }

  setLoggedInUser(user: UserLoggedInPostRes) {
    this.userState.next(user);
  }

  logoutUser() {
    localStorage.clear();
    this.userState.next(null);
    return this.navCtrl.navigateRoot('/login')
  }

  canActivate(): boolean {
    const user = this.userState.getValue();

    if (user && user.user.accout_status == 0) {
      return true;
    }
    this.router.navigateByUrl('/login');
    return false;
  }

  reqOTP(email: string): Observable<any>{
    const url = `${this.endPoint}/auth/SendOTP`;
    return this.http.post(url, {email});
  }

  verifyOTP(email: string, otp: string):Observable<any>{
    const url = `${this.endPoint}/auth/OTPVerify`;
    return this.http.delete(url, {body: {email: email.trim(), otp: otp.trim()}});
  }
}
