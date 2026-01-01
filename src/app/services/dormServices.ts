import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DormAllGetRes } from '../model/responses/dorm_all_get_res';
import { environment } from 'src/environments/environment';
import { FacOfDormGetRes } from '../model/responses/fac_ofDorm_get_res';

@Injectable({
  providedIn: 'root',
})
export class DormServices {
  endPoint = environment.ENDPOINT;
  constructor(private http: HttpClient) {}

  getDorms(): Observable<DormAllGetRes> {
    console.log(this.endPoint);
    
    const url = `${this.endPoint}/dorms`;
    return this.http.get<DormAllGetRes>(url);
  }

  getFacByDormID(dorm_id: number): Observable<FacOfDormGetRes> {
    const url = `${this.endPoint}/dorms/facility/${dorm_id}`;
    return this.http.get<FacOfDormGetRes>(url);
  }
}
