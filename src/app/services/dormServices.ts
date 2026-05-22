import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout, catchError, throwError } from 'rxjs';
import { DormAllGetRes, FacOfDormGetRes } from '../model/dorm.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DormServices {
  endPoint = environment.ENDPOINT;
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  constructor(private http: HttpClient) {}

  getDorms(): Observable<DormAllGetRes> {
    const url = `${this.endPoint}/dorms`;
    return this.http.get<DormAllGetRes>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getDorms error or timeout:', err);
        return throwError(() => err);
      })
    );
  }

  getFacByDormID(dorm_id: number): Observable<FacOfDormGetRes> {
    const url = `${this.endPoint}/dorms/facility/${dorm_id}`;
    return this.http.get<FacOfDormGetRes>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getFacByDormID error or timeout:', err);
        return throwError(() => err);
      })
    );
  }
}
