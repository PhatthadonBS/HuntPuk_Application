import { Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, take } from 'rxjs';
import { UserDataGetRes } from '../model/responses/user_data_get_res';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { UserRegPostReq } from '../model/requests/user_reg_post_req';
import { UserUpdatePostReq } from '../model/requests/user_update_post_req';

@Injectable({
  providedIn: 'root',
})
export class UserServices {
  private endPoint: string = environment.ENDPOINT;

  constructor(private http: HttpClient) {}

  getUserByID(uid: number): Observable<UserDataGetRes> {
    const url = `${this.endPoint}/spec/user/${uid}`;
    return this.http.get<UserDataGetRes>(url);
  }

  login(formData: any): Observable<any> {
    const url = `${this.endPoint}/auth/login`;
    return this.http.post(url, formData);
  }

  register(formdata: UserRegPostReq): Observable<UserRegPostReq> {
    const url = `${this.endPoint}/user/registerSec1`;
    return this.http.post<UserRegPostReq>(url, formdata);
  }

  register2(
    datum: UserRegPostReq,
    status: boolean,
    isAdmin: boolean
  ): Observable<UserRegPostReq> {
    const url = `${this.endPoint}/user/registerSec2`;
    return this.http.post<UserRegPostReq>(url, {
      userData: datum,
      verify: status,
      admin: isAdmin,
    });
  }

  profileUpdate(user_id: number, formData: UserUpdatePostReq): Observable<any>{
    const url = `${this.endPoint}/spec/user/${user_id}`
    return this.http.put(url, formData)
  }

  deleteAccount(user_id: number): Observable<any>{
    const url = `${this.endPoint}/spec/delAccount/${user_id}`
    return this.http.delete(url)
  }
}
