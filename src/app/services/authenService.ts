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
@Injectable({
  providedIn: 'root',
})
export class AuthenService implements CanActivate {
  constructor(private router: Router, private http: HttpClient) {}
  endPoint = environment.ENDPOINT;
  private userState = new BehaviorSubject<UserDataGetRes | null>(
    this.getUserFromStorage()
  );
  user$ = this.userState.asObservable();

  private getUserFromStorage(): UserDataGetRes | null {
    const uLog = localStorage.getItem('user');
    if (uLog) {
      try {
        return JSON.parse(uLog);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  setLoggedInUser(user: UserDataGetRes) {
    localStorage.setItem('user', JSON.stringify(user));
    this.userState.next(user);
  }

  logoutUser() {
    localStorage.clear();
    this.userState.next(null);
    return this.router.navigateByUrl('/login');
  }

  canActivate(): boolean {
    const user = this.userState.getValue();

    if (user && user.ACCOUNT_STATUS == 0) {
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
