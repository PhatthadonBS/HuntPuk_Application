import { Injectable, signal } from '@angular/core';
import { catchError, Observable, shareReplay, take, tap } from 'rxjs';
import { UserAllGetRes, UserDataGetRes, UserDormOwnerGetRes, UserRegPostReq, UserUpdatePostReq } from '../model/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserServices {
  private endPoint: string = environment.ENDPOINT;
  favIds = signal<number[]>([]);

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
  ): Observable<any> {
    const url = `${this.endPoint}/user/registerSec2`;
    return this.http.post<any>(url, {
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

  hardDeleteAccount(user_id: number): Observable<any>{
    const url = `${this.endPoint}/admin/users/hardDelete/${user_id}`;
    return this.http.delete(url);
  }

  resetPassword(data: { email: string; password: string; verify: boolean }): Observable<any> {
    const url = `${this.endPoint}/user/resetPassword`;
    return this.http.put(url, data);
  }

  loadFavIds(uid: number) {
    this.getMyFavorites(uid).subscribe({
      next: (res) => {
        if (res.success) {
          this.favIds.set(res.data.map((f: any) => f.DORMID));
        }
      },
      error: (err) => console.error('Error loading favorites', err),
    });
  }

  addFavorite(dorm_id: number): Observable<any> {
    const url = `${this.endPoint}/other/addFavorite`;
    const current = this.favIds();
    if (!current.includes(dorm_id)) {
      this.favIds.set([...current, dorm_id]);
    }
    return this.http.post(url, { dorm_id }).pipe(
      catchError((err) => {
        this.favIds.set(this.favIds().filter((id) => id !== dorm_id));
        throw err;
      })
    );
  }

  removeFavorite(dorm_id: number): Observable<any> {
    const url = `${this.endPoint}/other/delFavorite`;
    const current = this.favIds();
    this.favIds.set(current.filter((id) => id !== dorm_id));
    return this.http.request('delete', url, { body: { dorm_id } }).pipe(
      catchError((err) => {
        const cur = this.favIds();
        if (!cur.includes(dorm_id)) {
          this.favIds.set([...cur, dorm_id]);
        }
        throw err;
      })
    );
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

  getPendingOwnerRequests(search?: string, status?: number): Observable<{success: boolean, data: UserDormOwnerGetRes[]}> {
    let url = `${this.endPoint}/user/dormOwnerReqAll`;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status !== undefined) params.append('status', status.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.http.get<{success: boolean, data: UserDormOwnerGetRes[]}>(url);
  }

  approveDormOwnerRequest(user_id: number, approve_status: boolean, msg: string): Observable<any> {
    const url = `${this.endPoint}/user/approve`;
    return this.http.put(url, { user_id, approve_status, msg });
  }
}
