import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token = localStorage.getItem('token');

  if (token) {
    try {
      // Try to parse in case it was stored as a JSON string (as done in login page)
      const parsed = JSON.parse(token);
      if (typeof parsed === 'string') {
        token = parsed;
      }
    } catch (e) {
      // Not a JSON string, use as is
    }

    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedReq);
  }
  return next(req);
};
