import { Injectable } from '@angular/core';
import { UserDataGetRes } from '../model/user.model';
import { CanActivate, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthenService } from './authenService';

@Injectable({
  providedIn: 'root',
})
export class LoggedInServices implements CanActivate{
  constructor(private router: Router) {}
  user!: UserDataGetRes | null;
  
  canActivate(): boolean {
    let uLog = localStorage.getItem('user');
    
    let user: UserDataGetRes;
    if(uLog){
      user = JSON.parse(uLog)
      this.router.navigateByUrl("/")
      return false
    }else{
      return true
    }
  }
}
