import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout, catchError, throwError, of, map } from 'rxjs';
import { DormAllGetRes, FacOfDormGetRes, DormZoneGetRes, DormDetailGetRes, ReviewGetRes, FacilityGetRes, MasterType, DormSummary } from '../model/dorm.model';
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

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('huntpuk_device_id');
    if (!deviceId) {
      // Fallback for older environments without crypto.randomUUID
      deviceId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
      localStorage.setItem('huntpuk_device_id', deviceId);
    }
    return deviceId;
  }

  // ==================== Analytics ====================
  recordWebsiteView(): Observable<any> {
    const headers = { 'X-Device-Id': this.getDeviceId() };
    return this.http.post(`${this.endPoint}/views/website`, {}, { headers }).pipe(
      catchError(err => {
        console.error('Failed to record website view', err);
        return of(null);
      })
    );
  }

  recordDormView(dormId: string | number): Observable<any> {
    const headers = { 'X-Device-Id': this.getDeviceId() };
    return this.http.post(`${this.endPoint}/views/dorm/${dormId}`, {}, { headers }).pipe(
      catchError(err => {
        console.error('Failed to record dorm view', err);
        return of(null);
      })
    );
  }
  // ===================================================

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

  addDormZone(name: string, lat?: number, lng?: number): Observable<any> {
    const url = `${this.endPoint}/dorms/zones`;
    return this.http.post<any>(url, { name, lat, lng }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('addDormZone error:', err);
        return throwError(() => err);
      })
    );
  }

  deleteDormZone(id: number): Observable<any> {
    const url = `${this.endPoint}/dorms/zones/${id}`;
    return this.http.delete<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('deleteDormZone error:', err);
        return throwError(() => err);
      })
    );
  }

  updateMasterType(type: string, id: number, name: string, lat?: number, lng?: number): Observable<any> {
    const url = `${this.endPoint}/type_management/${type}/${id}`;
    const payload = { name, lat, lng };
    return this.http.put<any>(url, payload).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('updateMasterType error:', err);
        return throwError(() => err);
      })
    );
  }

  getReviewsByDormId(dorm_id: number): Observable<ReviewGetRes> {
    const url = `${this.endPoint}/dorms/review/${dorm_id}`;
    return this.http.get<ReviewGetRes>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getReviewsByDormId error or timeout:', err);
        return throwError(() => err);
      })
    );
  }

  addReview(data: { user_id: number; dorm_id: number; score: number; comment: string }): Observable<any> {
    const url = `${this.endPoint}/user/review`;
    return this.http.post<any>(url, data).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('addReview error or timeout:', err);
        return throwError(() => err);
      })
    );
  }

  getFacilities(): Observable<FacilityGetRes> {
    const url = `${this.endPoint}/dorms/facilities`;
    return this.http.get<FacilityGetRes>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getFacilities error:', err);
        return throwError(() => err);
      })
    );
  }

  getDormTypes(): Observable<MasterType[]> {
    const url = `${this.endPoint}/dorms/dormTypes`;
    return this.http.get<{ success: boolean; data: MasterType[] }>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map(res => res.data),
      catchError(err => {
        console.error('getDormTypes error:', err);
        return throwError(() => err);
      })
    );
  }

  addDormType(name: string): Observable<any> {
    const url = `${this.endPoint}/dorms/dormTypes`;
    return this.http.post<any>(url, { name }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('addDormType error:', err);
        return throwError(() => err);
      })
    );
  }

  deleteDormType(id: number): Observable<any> {
    const url = `${this.endPoint}/dorms/dormTypes/${id}`;
    return this.http.delete<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('deleteDormType error:', err);
        return throwError(() => err);
      })
    );
  }

  getRoomTypes(): Observable<MasterType[]> {
    const url = `${this.endPoint}/dorms/roomTypes`;
    return this.http.get<{ success: boolean; data: MasterType[] }>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map(res => res.data),
      catchError(err => {
        console.error('getRoomTypes error:', err);
        return throwError(() => err);
      })
    );
  }

  addRoomType(name: string): Observable<any> {
    const url = `${this.endPoint}/dorms/roomTypes`;
    return this.http.post<any>(url, { name }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('addRoomType error:', err);
        return throwError(() => err);
      })
    );
  }

  deleteRoomType(id: number): Observable<any> {
    const url = `${this.endPoint}/dorms/roomTypes/${id}`;
    return this.http.delete<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('deleteRoomType error:', err);
        return throwError(() => err);
      })
    );
  }

  getBedTypes(): Observable<MasterType[]> {
    const url = `${this.endPoint}/dorms/bedTypes`;
    return this.http.get<{ success: boolean; data: MasterType[] }>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map(res => res.data),
      catchError(err => {
        console.error('getBedTypes error:', err);
        return throwError(() => err);
      })
    );
  }

  addBedType(name: string): Observable<any> {
    const url = `${this.endPoint}/dorms/bedTypes`;
    return this.http.post<any>(url, { name }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('addBedType error:', err);
        return throwError(() => err);
      })
    );
  }

  deleteBedType(id: number): Observable<any> {
    const url = `${this.endPoint}/dorms/bedTypes/${id}`;
    return this.http.delete<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('deleteBedType error:', err);
        return throwError(() => err);
      })
    );
  }

  getPriceTypes(): Observable<MasterType[]> {
    const url = `${this.endPoint}/dorms/priceTypes`;
    return this.http.get<{ success: boolean; data: MasterType[] }>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map(res => res.data),
      catchError(err => {
        console.error('getPriceTypes error:', err);
        return throwError(() => err);
      })
    );
  }

  addPriceType(name: string): Observable<any> {
    const url = `${this.endPoint}/dorms/priceTypes`;
    return this.http.post<any>(url, { name }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('addPriceType error:', err);
        return throwError(() => err);
      })
    );
  }

  deletePriceType(id: number): Observable<any> {
    const url = `${this.endPoint}/dorms/priceTypes/${id}`;
    return this.http.delete<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('deletePriceType error:', err);
        return throwError(() => err);
      })
    );
  }

  getDormStatuses(): Observable<MasterType[]> {
    const url = `${this.endPoint}/dorms/dormStatuses`;
    return this.http.get<{ success: boolean; data: MasterType[] }>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      map(res => res.data),
      catchError(err => {
        console.error('getDormStatuses error:', err);
        return throwError(() => err);
      })
    );
  }

  addDormStatus(name: string): Observable<any> {
    const url = `${this.endPoint}/dorms/dormStatuses`;
    return this.http.post<any>(url, { name }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('addDormStatus error:', err);
        return throwError(() => err);
      })
    );
  }

  deleteDormStatus(id: number): Observable<any> {
    const url = `${this.endPoint}/dorms/dormStatuses/${id}`;
    return this.http.delete<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('deleteDormStatus error:', err);
        return throwError(() => err);
      })
    );
  }

  registerDorm(data: any): Observable<any> {
    const url = `${this.endPoint}/dorms/mobile`;
    return this.http.post<any>(url, data).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('registerDorm error:', err);
        return throwError(() => err);
      })
    );
  }

  uploadDormImages(dormId: number, formData: FormData): Observable<any> {
    const url = `${this.endPoint}/dorms/mobile/${dormId}/images`;
    return this.http.post<any>(url, formData).pipe(
      timeout(60000), // Longer timeout for multiple high-res images
      catchError(err => {
        console.error('uploadDormImages error:', err);
        return throwError(() => err);
      })
    );
  }

  getDormByOwner(user_id: number): Observable<{ success: boolean; data: DormSummary[] }> {
    const url = `${this.endPoint}/spec/dorm/${user_id}`;
    return this.http.get<{ success: boolean; data: DormSummary[] }>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getDormByOwner error:', err);
        return throwError(() => err);
      })
    );
  }

  updateDorm(dorm_id: number, data: any): Observable<any> {
    const url = `${this.endPoint}/spec/dorm/${dorm_id}`;
    return this.http.put<any>(url, data).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('updateDorm error:', err);
        return throwError(() => err);
      })
    );
  }

  changeDormStatus(dorm_id: number, status_id: number): Observable<any> {
    const url = `${this.endPoint}/dorms/changeStatus/${dorm_id}`;
    return this.http.put<any>(url, { status_id }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('changeDormStatus error:', err);
        return throwError(() => err);
      })
    );
  }

  removeDorm(dorm_id: number): Observable<any> {
    const url = `${this.endPoint}/spec/dorm/${dorm_id}`;
    return this.http.delete<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('removeDorm error:', err);
        return throwError(() => err);
      })
    );
  }

  getFacilitiesOfDorm(dorm_id: string): Observable<any> {
    const url = `${this.endPoint}/dorms/facility/${dorm_id}`;
    return this.http.get<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getFacilitiesOfDorm error:', err);
        return throwError(() => err);
      })
    );
  }
  getFacilityRequests(): Observable<FacilityGetRes> {
    const url = `${this.endPoint}/admin/facilities/requests`;
    return this.http.get<FacilityGetRes>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getFacilityRequests error:', err);
        return throwError(() => err);
      })
    );
  }

  approveFacility(facId: number): Observable<any> {
    const url = `${this.endPoint}/admin/facilities/approve/${facId}`;
    return this.http.put<any>(url, {}).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('approveFacility error:', err);
        return throwError(() => err);
      })
    );
  }

  rejectFacility(facId: number): Observable<any> {
    const url = `${this.endPoint}/admin/facilities/reject/${facId}`;
    return this.http.delete<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('rejectFacility error:', err);
        return throwError(() => err);
      })
    );
  }

  deleteFacility(facId: number): Observable<any> {
    const url = `${this.endPoint}/admin/facilities/${facId}`;
    return this.http.delete<any>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('deleteFacility error:', err);
        return throwError(() => err);
      })
    );
  }

  getAllDormsAdmin(): Observable<DormAllGetRes> {
    const url = `${this.endPoint}/dorms/admin/mobile`;
    return this.http.get<DormAllGetRes>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getAllDormsAdmin error:', err);
        return throwError(() => err);
      })
    );
  }

  getPendingDormReq(): Observable<DormAllGetRes> {
    const url = `${this.endPoint}/dorms/pendingReq`;
    return this.http.get<DormAllGetRes>(url).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('getPendingDormReq error:', err);
        return throwError(() => err);
      })
    );
  }

  approveDormReq(data: { dorm_id: number; approve_status: boolean; msg?: string }): Observable<any> {
    const url = `${this.endPoint}/dorms/approve`;
    return this.http.post<any>(url, data).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('approveDormReq error:', err);
        return throwError(() => err);
      })
    );
  }

  updateFacility(userId: number, formData: FormData): Observable<any> {
    const url = `${this.endPoint}/dorms/facility/${userId}`;
    return this.http.put<any>(url, formData).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => {
        console.error('updateFacility error:', err);
        return throwError(() => err);
      })
    );
  }
}
