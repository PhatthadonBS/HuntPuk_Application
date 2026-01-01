import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { LoadingController } from '@ionic/angular/standalone';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private requestCount = 0;
  
  // สร้าง Signal เพื่อเก็บสถานะ (true = โชว์, false = ซ่อน)
  isLoading = signal<boolean>(false);

  show() {
    this.requestCount++;
    if (this.requestCount === 1) {
      this.isLoading.set(true); // สั่งเปิด
    }
  }

  hide() {
    this.requestCount--;
    if (this.requestCount <= 0) {
      this.requestCount = 0;
      this.isLoading.set(false); // สั่งปิด
    }
  }
}

