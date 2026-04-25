import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  signal,
  ViewChild,
  OnDestroy // เพิ่ม OnDestroy
} from '@angular/core';
import {
  IonContent,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Datum } from 'src/app/model/responses/dorm_all_get_res';
import { DormServices } from 'src/app/services/dormServices';
import { GoogleMapService } from 'src/app/services/google-map-service';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { NavFooterComponent } from '../../components/nav-footer/nav-footer.component';
import { filter, finalize, Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true, // อย่าลืมใส่ standalone: true ถ้าใช้ imports
  imports: [
    IonContent,
    LoadingUIComponent,
    CommonModule,
    FormsModule,
  ],
})
export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('map', { static: false }) mapEl!: ElementRef<HTMLElement>;

  map!: google.maps.Map;
  markers: google.maps.Marker[] = [];

  dorms: Datum[] = [];
  filteredDorms: Datum[] = [];

  selectedDorm: Datum | null = null;
  sheetOpen = false;
  isLoading = signal(false);
  private routerSub: Subscription;
  private mapInitialized = false;

  constructor(
    private dormService: DormServices,
    private ggmService: GoogleMapService,
    private router: Router,
    private zone: NgZone
  ) {
    
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.refreshData();
    });
  }

  async ngAfterViewInit() {
    try {
      this.isLoading.set(true);
      await this.ggmService.load();
      
      this.zone.runOutsideAngular(() => {
        this.initMap(); 
      });
      
      this.loadDormMarkers(); 
      this.isLoading.set(false);
    } catch (error) {
      console.error(error);
    } finally {
      this.isLoading.set(false);
    }
  }
  async ionViewWillEnter() {
    if (this.mapInitialized) {
        this.loadDormMarkers();
    }
  }

  initMap() {
    if (!this.mapEl?.nativeElement) return;

    this.map = new google.maps.Map(this.mapEl.nativeElement, {
      center: { lat: 16.2455, lng: 103.25 },
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: false,
      gestureHandling: 'greedy',
      clickableIcons: false,
      scrollwheel: true,
    });
    
    this.mapInitialized = true;
  }

  loadDormMarkers() {
    this.isLoading.set(true); 
    
    this.dormService
      .getDorms()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe((res) => {
        this.dorms = res.data;
        this.filteredDorms = [...this.dorms];

        this.zone.runOutsideAngular(() => {
          this.renderMarkers(this.filteredDorms);
        });
      });
  }

  renderMarkers(dorms: Datum[]) {
    this.clearMarkers();

    if (!this.map) return;

    dorms.forEach((dorm) => {
      const marker = new google.maps.Marker({
        position: { lat: dorm.lat, lng: dorm.lng },
        map: this.map,
        title: dorm.DORM_NAME,
        icon: {
          url: 'assets/icon/dormPin.png',
          scaledSize: new google.maps.Size(40, 40),
        },
        animation: null,
      });

      marker.addListener('click', () => {
        this.zone.run(() => {
          this.onMarkerClick(dorm);
        });
      });

      this.markers.push(marker);
    });
  }

  clearMarkers() {
    this.markers.forEach((m) => m.setMap(null));
    this.markers.length = 0;
  }

  onMarkerClick(dorm: Datum) {
    this.selectedDorm = dorm;
    this.sheetOpen = true;

    this.map.panTo({ lat: dorm.lat, lng: dorm.lng });
    
    const targetZoom = 17;
    let currentZoom = this.map.getZoom() ?? 15;
    if(currentZoom < targetZoom) {
        const zoomInterval = setInterval(() => {
        if (currentZoom >= targetZoom) {
            clearInterval(zoomInterval);
            return;
        }
        currentZoom = currentZoom + 0.89762;
        this.map.setZoom(currentZoom);
        }, 100);
    }
  }

  refreshData() {
    this.loadDormMarkers();
    if(this.map) {
        this.map.panTo({ lat: 16.2455, lng: 103.25 });
        this.map.setZoom(15);
    }
  }
  
  ngOnDestroy() {
      if(this.routerSub) {
          this.routerSub.unsubscribe();
      }
  }
}