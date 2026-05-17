import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import {
  CanActivate,
  Router,
} from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserDataGetRes, UserLoggedInPostRes } from '../model/user.model';
import { environment } from 'src/environments/environment';
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
    let token = localStorage.getItem('token');
    
    if (token) {
      try {
        // Handle potential JSON stringification
        if (token.startsWith('"') && token.endsWith('"')) {
          token = JSON.parse(token);
        }

        if (!token) return null;

        // Decode Token
        const decodedToken: any = jwtDecode(token);
        
        // Check expiration
        const currentTime = Math.floor(Date.now() / 1000);
        if (decodedToken.exp < currentTime) {
          console.log('Token expired!');
          this.logoutUser();
          return null;
        }

        return decodedToken; 
      } catch (e) {
        return null; 
      }
    }
    return null;
  }

  setLoggedInUser(user: UserLoggedInPostRes) {
    this.userState.next(user);
  }

  get currentUserValue(): UserLoggedInPostRes | null {
    return this.userState.getValue();
  }

  logoutUser() {
    localStorage.clear();
    this.userState.next(null);
    return this.navCtrl.navigateRoot('/login')
  }

  canActivate(): boolean {
    const user = this.userState.getValue();
    if (user) {
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
