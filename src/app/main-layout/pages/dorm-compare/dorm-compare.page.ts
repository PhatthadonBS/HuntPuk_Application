import { Component, OnInit, signal, computed, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonButton,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonSpinner,
  IonPopover,
  IonFooter,
  IonCheckbox,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { DormServices } from 'src/app/services/dormServices';
import { AuthenService } from 'src/app/services/authenService';
import { DormSummary, DormDetail, DormZone } from 'src/app/model/dorm.model';
import { environment } from 'src/environments/environment';
import { addIcons } from 'ionicons';
import {
  addOutline,
  closeCircleOutline,
  arrowBackCircleOutline,
  searchOutline,
  closeOutline,
  mapOutline,
  locationOutline,
  location,
  ellipsisVerticalOutline,
  trashOutline,
  starOutline,
  star,
  cashOutline,
  waterOutline,
  flashOutline,
  navigateOutline,
  bedOutline,
  checkmarkDoneOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
  fingerPrintOutline,
  closeCircle,
  add,
  gitCompareOutline,
  addCircle
} from 'ionicons/icons';
import { GoogleMapService } from 'src/app/services/google-map-service';
import { Subscription } from 'rxjs';
import { FilterGroupComponent, FilterParams } from '../../components/filter-group/filter-group.component';

declare var google: any;

interface CompareDorm extends DormDetail {
  distance?: number;
}

@Component({
  selector: 'app-dorm-compare',
  templateUrl: './dorm-compare.page.html',
  styleUrls: ['./dorm-compare.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonButton,
    IonModal,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonSpinner,
    IonPopover,
    IonFooter,
    IonCheckbox,
    IonFab,
    IonFabButton,
    FilterGroupComponent
  ],
})
export class DormComparePage implements OnInit, OnDestroy {
  env = environment;

  maxDorms = signal<number>(2);
  selectedDorms = signal<CompareDorm[]>([]);
  private userSub: Subscription | null = null;

  isModalOpen = signal<boolean>(false);
  allDorms = signal<DormSummary[]>([]);
  zones = signal<DormZone[]>([]);
  
  filterParams = signal<FilterParams>({});
  
  isLoadingModal = signal<boolean>(false);
  isLoadingDetail = signal<boolean>(false);

  tempSelectedDormIds = signal<number[]>([]);

  isMapModalOpen = signal<boolean>(false);
  map: any = null; 
  private marker: any = null; 
  private dormMarkers: any[] = [];
  private dirRenderers: any[] = [];
  private dirService: any = null;
  refPoint = signal<{ lat: number; lng: number } | null>(null);

  filteredDorms = computed(() => {
    const currentSelectedIds = this.selectedDorms().map((d) => d.DORM_ID);
    return this.allDorms().filter((d) => !currentSelectedIds.includes(d.DORM_ID));
  });

  constructor(
    private dormSv: DormServices,
    private authSv: AuthenService,
    private gMapSv: GoogleMapService
  ) {
    addIcons({
      addOutline,
      closeCircleOutline,
      arrowBackCircleOutline,
      searchOutline,
      closeOutline,
      mapOutline,
      locationOutline,
      location,
      ellipsisVerticalOutline,
      trashOutline,
      starOutline,
      star,
      cashOutline,
      waterOutline,
      flashOutline,
      navigateOutline,
      bedOutline,
      checkmarkDoneOutline,
      informationCircleOutline,
      checkmarkCircleOutline,
      fingerPrintOutline,
      closeCircle,
      add,
      gitCompareOutline,
      addCircle,
    });
  }

  ngOnInit() {
    this.userSub = this.authSv.user$.subscribe((user) => {
      const isLoggedIn = !!user;
      this.maxDorms.set(isLoggedIn ? 5 : 2);
    });
    this.loadAllDorms();
    this.loadZones();
  }

  ngOnDestroy() {
    this.destroyMap();
    if (this.userSub) this.userSub.unsubscribe();
  }

  loadZones() {
    this.dormSv.getZones().subscribe({
      next: (res) => {
        if (res.success) this.zones.set(res.data);
      },
      error: (err) => console.error('Error fetching zones', err)
    });
  }

  loadAllDorms() {
    this.isLoadingModal.set(true);
    this.dormSv.getDorms(this.filterParams()).subscribe({
      next: (res) => {
        if (res.success) this.allDorms.set(res.data);
        this.isLoadingModal.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoadingModal.set(false);
      },
    });
  }

  openSelectModal() {
    if (this.selectedDorms().length >= this.maxDorms()) return;
    this.filterParams.set({}); 
    this.tempSelectedDormIds.set([]); 
    this.loadAllDorms(); // Load fresh list without filters
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  handleFilterApplied(params: FilterParams) {
    this.filterParams.set(params);
    this.loadAllDorms(); // Fetch filtered list
  }

  toggleDormSelection(dormId: number, event: any) {
    const isChecked = event.detail.checked;
    this.tempSelectedDormIds.update(ids => {
      if (isChecked) {
        if (this.selectedDorms().length + ids.length >= this.maxDorms()) {
          setTimeout(() => {
            event.target.checked = false; // revert the visually checked state
          }, 0);
          return ids; 
        }
        return [...ids, dormId];
      } else {
        return ids.filter(id => id !== dormId);
      }
    });
  }

  confirmDormSelection() {
    const idsToFetch = this.tempSelectedDormIds();
    if (idsToFetch.length === 0) {
      this.closeModal();
      return;
    }

    this.closeModal();
    this.isLoadingDetail.set(true);

    const fetchPromises = idsToFetch.map(id => {
      return new Promise<CompareDorm | null>((resolve) => {
        this.dormSv.getDormById(id).subscribe({
          next: (res) => {
            if (res.success) {
              const newDorm: CompareDorm = { ...res.data };
              if (this.refPoint()) {
                newDorm.distance = this.calculateDistance(
                  this.refPoint()!.lat,
                  this.refPoint()!.lng,
                  newDorm.lat,
                  newDorm.lng
                );
              }
              resolve(newDorm);
            } else {
              resolve(null);
            }
          },
          error: (err) => {
            console.error('Error fetching multiple dorm details', err);
            resolve(null);
          }
        });
      });
    });

    Promise.all(fetchPromises).then(results => {
      const newDorms = results.filter(d => d !== null) as CompareDorm[];
      this.selectedDorms.update((dorms) => [...dorms, ...newDorms]);
      this.isLoadingDetail.set(false);
    }).catch(err => {
      console.error('Promise.all error', err);
      this.isLoadingDetail.set(false);
    });
  }

  removeDorm(index: number) {
    this.selectedDorms.update((dorms) => {
      const newDorms = [...dorms];
      newDorms.splice(index, 1);
      return newDorms;
    });
  }

  clearAll() {
    this.selectedDorms.set([]);
  }

  clearRefPoint() {
    this.refPoint.set(null);
    this.selectedDorms.update((dorms) =>
      dorms.map((d) => {
        const { distance, ...rest } = d as any;
        return rest as CompareDorm;
      })
    );
  }

  openMapModal() {
    this.isMapModalOpen.set(true);
  }

  closeMapModal() {
    this.isMapModalOpen.set(false);
  }

  async onMapModalPresented(event: CustomEvent) {
    const modalHostEl = event.target as HTMLElement;
    await this.initMap(modalHostEl);
  }

  async onMapModalDismissed() {
    await this.destroyMap();
  }

  async initMap(modalHostEl: HTMLElement) {
    const el = modalHostEl.querySelector<HTMLElement>('#map-el');
    if (!el) {
      console.error('initMap: #map-el not found inside modal');
      return;
    }

    try {
      await this.gMapSv.load();

      this.map = new google.maps.Map(el, {
        center: { lat: 16.2458428, lng: 103.2492193 },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });

      this.dirService = new google.maps.DirectionsService();

      this.renderMapFeatures();

      this.map.addListener('click', (event: any) => {
        const latLng = event.latLng;
        this.refPoint.set({ lat: latLng.lat(), lng: latLng.lng() });
        this.renderMapFeatures();
      });
    } catch (e) {
      console.error('Google Map JS SDK init failed:', e);
    }
  }

  renderMapFeatures() {
    if (!this.map) return;

    // Clear existing
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    this.dormMarkers.forEach((m) => m.setMap(null));
    this.dormMarkers = [];
    this.dirRenderers.forEach((r) => r.setMap(null));
    this.dirRenderers = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    // 1. Draw Reference Point
    const ref = this.refPoint();
    if (ref) {
      this.marker = new google.maps.Marker({
        position: ref,
        map: this.map,
        title: 'จุดอ้างอิง',
        icon: {
          url: 'assets/icon/map-pin.png',
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40),
        },
        zIndex: 100,
      });
      bounds.extend(ref);
      hasPoints = true;
    }

    // 2. Draw Dormitories & Routes
    const dorms = this.selectedDorms();
    dorms.forEach((dorm) => {
      const dormPos = { lat: dorm.lat, lng: dorm.lng };
      const m = new google.maps.Marker({
        position: dormPos,
        map: this.map,
        title: dorm.DORM_NAME,
        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Blue marker for dorms
        zIndex: 50,
      });
      this.dormMarkers.push(m);
      bounds.extend(dormPos);
      hasPoints = true;

      // Request Route
      if (ref && this.dirService) {
        const req = {
          origin: ref,
          destination: dormPos,
          travelMode: google.maps.TravelMode.DRIVING,
        };
        this.dirService.route(req, (result: any, status: any) => {
          if (status === 'OK') {
            const renderer = new google.maps.DirectionsRenderer({
              map: this.map,
              suppressMarkers: true,
              preserveViewport: true, // Let bounds extension handle zoom
              polylineOptions: {
                strokeColor: '#3b82f6', // Matching distance-cell blue
                strokeWeight: 4,
                strokeOpacity: 0.7,
              },
            });
            renderer.setDirections(result);
            this.dirRenderers.push(renderer);
          }
        });
      }
    });

    if (hasPoints) {
      this.map.fitBounds(bounds);
      // Prevent zooming in too much if only 1 point exists
      const listener = google.maps.event.addListener(this.map, 'idle', () => {
        if (this.map.getZoom() > 16) this.map.setZoom(16);
        google.maps.event.removeListener(listener);
      });
    }
  }

  async destroyMap() {
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    this.dormMarkers.forEach((m) => m.setMap(null));
    this.dormMarkers = [];
    this.dirRenderers.forEach((r) => r.setMap(null));
    this.dirRenderers = [];
    this.dirService = null;
    this.map = null;
  }

  confirmMapSelection() {
    if (this.refPoint()) this.recalculateDistances();
    this.closeMapModal();
  }

  recalculateDistances() {
    const point = this.refPoint();
    if (!point) return;

    this.selectedDorms.update((dorms) =>
      dorms.map((dorm) => ({
        ...dorm,
        distance: this.calculateDistance(
          point.lat,
          point.lng,
          dorm.lat,
          dorm.lng
        ),
      }))
    );
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }
}
