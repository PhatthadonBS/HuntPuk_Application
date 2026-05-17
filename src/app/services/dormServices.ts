import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DormAllGetRes, FacOfDormGetRes } from '../model/dorm.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DormServices {
  endPoint = environment.ENDPOINT;
  constructor(private http: HttpClient) {}

  getDorms(): Observable<DormAllGetRes> {
    const url = `${this.endPoint}/dorms`;
    return this.http.get<DormAllGetRes>(url);
  }

  getFacByDormID(dorm_id: number): Observable<FacOfDormGetRes> {
    const url = `${this.endPoint}/dorms/facility/${dorm_id}`;
    return this.http.get<FacOfDormGetRes>(url);
  }
}
