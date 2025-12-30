import { AfterViewInit, Component, ElementRef, NgZone, signal, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonRouterLinkWithHref, IonSearchbar, IonButton, IonRadioGroup, IonItem, IonRadio, IonMenu, IonMenuToggle, IonFooter } from '@ionic/angular/standalone';
import { LoadingUIComponent } from '../components/loading-ui/loading-ui.component';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DormServices } from '../services/dormServices';
import { Datum } from '../model/responses/dorm_all_get_res';
import { FormsModule } from '@angular/forms';
import { GoogleMapService } from '../services/google-map-service';
import { NavFooterComponent } from "../components/nav-footer/nav-footer.component";

declare const google: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonFooter, IonItem, IonRadioGroup, IonButton,
    IonSearchbar,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    LoadingUIComponent,
    CommonModule,
    RouterLink, IonMenu, IonMenuToggle, IonRadioGroup, IonRadio, FormsModule, NavFooterComponent],
})
export class HomePage implements AfterViewInit {
  @ViewChild('map', { static: false }) mapEl!: ElementRef<HTMLElement>;

  map!: google.maps.Map;
  markers: google.maps.Marker[] = [];

  dorms: Datum[] = [];
  filteredDorms: Datum[] = [];

  selectedDorm: Datum | null = null;
  sheetOpen = false;
  isLoading = signal(false);

  constructor(
    private dormService: DormServices,
    private ggmService: GoogleMapService,
    private router: Router,
    private zone: NgZone
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  async ngAfterViewInit() {
    await this.ggmService.load();
    this.zone.runOutsideAngular(() => {
      this.initMap();
    });

    this.loadDormMarkers();
  }

  initMap() {
    this.map = new google.maps.Map(this.mapEl.nativeElement, {
      center: { lat: 16.2455, lng: 103.25 },
      zoom: 15,

      disableDefaultUI: true,
      zoomControl: false,
      gestureHandling: 'greedy',
      clickableIcons: false,
      scrollwheel: true,
      styles: [
        {
          featureType: 'poi',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });
  }

  loadDormMarkers() {
    this.dormService.getDorms().subscribe((res) => {
      this.dorms = res.data;
      this.filteredDorms = [...this.dorms];

      this.zone.runOutsideAngular(() => {
        this.renderMarkers(this.filteredDorms);
      });
    });
  }

  renderMarkers(dorms: Datum[]) {
    this.clearMarkers();

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

  const zoomInterval = setInterval(() => {
    if (currentZoom >= targetZoom) {
      clearInterval(zoomInterval);
      return;
    }
    currentZoom = currentZoom + 1.5;
    this.map.setZoom(currentZoom);
  }, 50);
}

}
