import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GoogleMapService {
    load(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src =
        'https://maps.googleapis.com/maps/api/js?key=AIzaSyD3H8L5h64r72N2qteAXC12FH1QRvocYQY';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }
}
