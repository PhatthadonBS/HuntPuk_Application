import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  signal,
  ViewChild,
  OnDestroy,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import {
  IonContent,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DormSummary } from 'src/app/model/dorm.model';
import { DormServices } from 'src/app/services/dormServices';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { filter, finalize, Subscription } from 'rxjs';
import { GoogleMap } from '@capacitor/google-maps';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    LoadingUIComponent,
    CommonModule,
    FormsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('map', { static: false }) mapEl!: ElementRef<HTMLElement>;

  newMap!: GoogleMap;
  dorms = signal<DormSummary[]>([]);
  selectedDorm = signal<DormSummary | null>(null);
  sheetOpen = signal(false);
  isLoading = signal(false);

  private routerSub: Subscription;

  constructor(
    private dormService: DormServices,
    private router: Router,
    private zone: NgZone
  ) {
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.loadDormMarkers();
    });
  }

  async ngAfterViewInit() {
    // Add a small delay for Live Reload environments to ensure the DOM is stable
    setTimeout(async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await this.initNativeMap();
        } catch (e) {
          console.error('CRITICAL: Failed to initialize native map:', e);
        }
      } else {
        console.warn('Native maps are only available on Android/iOS.');
      }
      this.loadDormMarkers();
    }, 500);
  }

  async initNativeMap() {
    if (!this.mapEl?.nativeElement) {
      console.error('Map element not found in DOM');
      return;
    }

    try {
      this.newMap = await GoogleMap.create({
        id: 'huntpuk-map',
        element: this.mapEl.nativeElement,
        apiKey: 'AIzaSyD3H8L5h64r72N2qteAXC12FH1QRvocYQY',
        config: {
          center: { lat: 16.2455, lng: 103.25 },
          zoom: 15,
        },
      });

      await this.newMap.setOnMarkerClickListener(async (event) => {
        const dorm = this.dorms().find(d => 
          Math.abs(d.lat - event.latitude) < 0.0001 && 
          Math.abs(d.lng - event.longitude) < 0.0001
        );
        if (dorm) {
          this.zone.run(() => {
            this.onMarkerClick(dorm);
          });
        }
      });
      
      console.log('Native map initialized successfully');
    } catch (err) {
      console.error('Map creation failed native side:', err);
    }
  }

  loadDormMarkers() {
    this.isLoading.set(true); 

    this.dormService
      .getDorms()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.dorms.set(res.data);
          if (this.newMap) {
            this.renderMarkers(res.data);
          }
        },
        error: (err) => console.error('Failed to load dorms:', err)
      });
  }

  async renderMarkers(dorms: DormSummary[]) {
    if (!this.newMap) return;

    try {
      const markers = dorms.map(dorm => ({
        coordinate: { lat: dorm.lat, lng: dorm.lng },
        title: dorm.DORM_NAME,
        snippet: dorm.ADDRESS,
      }));

      await this.newMap.addMarkers(markers);
    } catch (e) {
      console.error('Error adding markers:', e);
    }
  }

  async onMarkerClick(dorm: DormSummary) {
    this.selectedDorm.set(dorm);
    this.sheetOpen.set(true);

    if (this.newMap) {
      try {
        await this.newMap.setCamera({
          coordinate: { lat: dorm.lat, lng: dorm.lng },
          zoom: 17,
          animate: true
        });
      } catch (e) {
        console.error('Failed to move camera:', e);
      }
    }
  }

  ngOnDestroy() {
    if(this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.newMap) {
      this.newMap.destroy().catch(e => console.error('Failed to destroy map:', e));
    }
  }
}