import { HttpRequest, HttpHandler, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from './loading-service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService); // ใช้ inject() แทน constructor

  // เรียก Show
  loadingService.show();

  return next(req).pipe(
    // ทำงานเสมอเมื่อจบ request (ไม่ว่าจะ success หรือ error)
    finalize(() => {
      loadingService.hide();
    })
  );
};
