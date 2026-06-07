import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import {
  CanActivate,
  Router,
} from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { NavController } from '@ionic/angular';
import { jwtDecode } from 'jwt-decode';
import { DecodedToken, UserOtpVerifyPostRes } from '../model/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthenService implements CanActivate {
  constructor(private router: Router, private http: HttpClient, private navCtrl: NavController) {}
  endPoint = environment.ENDPOINT;
  
  // State holds only the decoded token information
  private userState = new BehaviorSubject<DecodedToken | null>(
    this.getUserFromToken()
  );
  user$ = this.userState.asObservable();

  private getUserFromToken(): DecodedToken | null {
    let token = localStorage.getItem('token');
    
    if (token) {
      try {
        // Handle potential JSON stringification
        if (token.startsWith('"') && token.endsWith('"')) {
          token = JSON.parse(token);
        }

        if (!token) return null;

        // Decode Token
        const decodedToken = jwtDecode<DecodedToken>(token);
        
        // Check expiration
        const currentTime = Math.floor(Date.now() / 1000);
        if (decodedToken.exp < currentTime) {
          console.warn('Token expired!');
          this.logoutUser();
          return null;
        }

        return decodedToken; 
      } catch (e) {
        console.error('Error decoding token:', e);
        this.logoutUser();
        return null; 
      }
    }
    return null;
  }

  // Call this after setting token in local storage
  loadUserFromToken() {
    this.userState.next(this.getUserFromToken());
  }

  get currentUserValue(): DecodedToken | null {
    return this.userState.getValue();
  }

  logoutUser() {
    localStorage.clear();
    this.userState.next(null);
    this.navCtrl.navigateRoot('/login');
    return ;
  }

  canActivate(): boolean {
    const user = this.getUserFromToken(); // Re-check token validity on activation
    if (user) {
      this.userState.next(user);
      return true;
    }
    
    this.logoutUser();
    return false;
  }

  reqOTP(email: string, type: 'register' | 'reset' | 'general' = 'register'): Observable<any>{
    let url = `${this.endPoint}/auth/SendOTP`;
    if (type === 'register') {
      url = `${this.endPoint}/auth/SendOTP/register`;
    } else if (type === 'reset') {
      url = `${this.endPoint}/auth/SendOTP/reset`;
    }
    return this.http.post(url, {email});
  }

  verifyOTP(email: string, otp: string):Observable<UserOtpVerifyPostRes>{
    const url = `${this.endPoint}/auth/OTPVerify`;
    return this.http.delete<UserOtpVerifyPostRes>(url, {body: {email: email.trim(), otp: otp.trim()}});
  }
}
