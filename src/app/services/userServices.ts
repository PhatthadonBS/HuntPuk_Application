import { Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, take } from 'rxjs';
import { UserAllGetRes, UserDataGetRes, UserDormOwnerGetRes, UserRegPostReq, UserUpdatePostReq } from '../model/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

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

  profileUpdate(user_id: number, formData: UserUpdatePostReq | FormData): Observable<any>{
    const url = `${this.endPoint}/spec/user/${user_id}`
    return this.http.put(url, formData)
  }

  deleteAccount(user_id: number): Observable<any>{
    const url = `${this.endPoint}/spec/delAccount/${user_id}`
    return this.http.delete(url)
  }

  resetPassword(data: { email: string; password: string; verify: boolean }): Observable<any> {
    const url = `${this.endPoint}/user/resetPassword`;
    return this.http.put(url, data);
  }

  addFavorite(dorm_id: number): Observable<any> {
    const url = `${this.endPoint}/other/addFavorite`;
    return this.http.post(url, { dorm_id });
  }

  removeFavorite(dorm_id: number): Observable<any> {
    const url = `${this.endPoint}/other/delFavorite`;
    return this.http.request('delete', url, { body: { dorm_id } });
  }

  getMyFavorites(uid: number): Observable<{success: boolean, data: any[]}> {
    const url = `${this.endPoint}/spec/favorite/${uid}`;
    return this.http.get<{success: boolean, data: any[]}>(url);
  }

  getMembers(): Observable<UserAllGetRes[]> {
    const url = `${this.endPoint}/user/members`;
    return this.http.get<UserAllGetRes[]>(url);
  }

  getDormOwners(): Observable<UserAllGetRes[]> {
    const url = `${this.endPoint}/user/dormOwners`;
    return this.http.get<UserAllGetRes[]>(url);
  }

  banAccount(user_id: number): Observable<any> {
    const url = `${this.endPoint}/spec/banAccount/${user_id}`;
    return this.http.put(url, {});
  }

  unbanAccount(user_id: number): Observable<any> {
    const url = `${this.endPoint}/spec/unbanAccount/${user_id}`;
    return this.http.put(url, {});
  }

  requestDormOwner(formData: FormData): Observable<any> {
    const url = `${this.endPoint}/user/dormOwner`;
    return this.http.post(url, formData);
  }

  getPendingOwnerRequests(): Observable<{success: boolean, data: UserDormOwnerGetRes[]}> {
    const url = `${this.endPoint}/user/dormOwnerReq`;
    return this.http.get<{success: boolean, data: UserDormOwnerGetRes[]}>(url);
  }

  approveDormOwnerRequest(user_id: number, approve_status: boolean, msg: string): Observable<any> {
    const url = `${this.endPoint}/user/approve`;
    return this.http.put(url, { user_id, approve_status, msg });
  }
}
