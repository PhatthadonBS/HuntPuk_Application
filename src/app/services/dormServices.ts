import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout, catchError, throwError } from 'rxjs';
import { DormAllGetRes, FacOfDormGetRes, DormZoneGetRes, DormDetailGetRes } from '../model/dorm.model';
import { environment } from 'src/environments/environment';

export interface DormQueryParams {
  search?: string;
  zone?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  score?: number | null;
  lat?: number;
  lng?: number;
  radius?: number; // in kilometers
}

@Injectable({
  providedIn: 'root',
})
export class DormServices {
  endPoint = environment.ENDPOINT;
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  constructor(private http: HttpClient) {}

  getDorms(params?: DormQueryParams): Observable<DormAllGetRes> {
    const url = `${this.endPoint}/dorms`;
    return this.fetchDorms(url, params);
  }

  getDormsMobile(params?: DormQueryParams): Observable<DormAllGetRes> {
    const url = `${this.endPoint}/dorms/mobile`;
    return this.fetchDorms(url, params);
  }

  private fetchDorms(url: string, params?: DormQueryParams): Observable<DormAllGetRes> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.zone) httpParams = httpParams.set('zone', params.zone);
      if (params.minPrice !== undefined && params.minPrice !== null && !isNaN(params.minPrice)) {
        httpParams = httpParams.set('minPrice', params.minPrice.toString());
      }
      if (params.maxPrice !== undefined && params.maxPrice !== null && !isNaN(params.maxPrice)) {
        httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
      }
      if (params.score !== undefined && params.score !== null && !isNaN(params.score)) {
        httpParams = httpParams.set('score', params.score.toString());
      }
      if (params.lat) httpParams = httpParams.set('lat', params.lat.toString());
      if (params.lng) httpParams = httpParams.set('lng', params.lng.toString());
      if (params.radius) httpParams = httpParams.set('radius', params.radius.toString());
    }

    return this.http.get<DormAllGetRes>(url, { params: httpParams }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error(`fetchDorms error or timeout at ${url}:`, err);
        return throwError(() => err);
      })
    );
  }

  getDormById(dorm_id: number): Observable<DormDetailGetRes> {
    const url = `${this.endPoint}/dorms/${dorm_id}`;
    return this.http.get<DormDetailGetRes>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getDormById error or timeout:', err);
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

  getZones(): Observable<DormZoneGetRes> {
    const url = `${this.endPoint}/dorms/zones`;
    return this.http.get<DormZoneGetRes>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getZones error or timeout:', err);
        return throwError(() => err);
      })
    );
  }
}
