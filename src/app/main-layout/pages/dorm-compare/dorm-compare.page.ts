import {
  Component,
  OnInit,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
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
  NavController,
  ToastController,
} from '@ionic/angular/standalone';
import { DormServices } from 'src/app/services/dormServices';
import { AuthenService } from 'src/app/services/authenService';
import {
  DormSummary,
  DormDetail,
  DormZone,
  FilterParams,
} from 'src/app/model/dorm.model';
import { environment } from 'src/environments/environment';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
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
  ellipsisHorizontal,
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
  reorderThreeOutline,
  cubeOutline,
} from 'ionicons/icons';
import { GoogleMapService } from 'src/app/services/google-map-service';
import { Subscription } from 'rxjs';
import { FilterGroupComponent } from '../../components/filter-group/filter-group.component';

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
    FilterGroupComponent,
    LoadingUIComponent,
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
  priceTypes = signal<any[]>([]);

  filterParams = signal<FilterParams>({});

  isLoadingModal = signal<boolean>(false);
  isLoadingDetail = signal<boolean>(false);

  tempSelectedDormIds = signal<number[]>([]);

  isMapModalOpen = signal<boolean>(false);
  map: any = null;
  private marker: any = null;
  private dormMarkers: any[] = [];
  private dirRenderers: any[] = [];
  private polylines: any[] = [];
  private dirService: any = null;
  refPoint = signal<{ lat: number; lng: number } | null>(null);

  filteredDorms = computed(() => {
    const currentSelectedIds = this.selectedDorms().map((d) => d.DORM_ID);
    const dorms = this.allDorms().filter(
      (d) => !currentSelectedIds.includes(d.DORM_ID)
    );

    const sortName = this.filterParams().sortByName;
    if (sortName === 'asc') {
      dorms.sort((a, b) => a.DORM_NAME.localeCompare(b.DORM_NAME, 'th'));
    } else if (sortName === 'desc') {
      dorms.sort((a, b) => b.DORM_NAME.localeCompare(a.DORM_NAME, 'th'));
    }

    const sort = this.filterParams().sortByPrice;

    if (sort === 'asc') {
      dorms.sort((a, b) => {
        if (a.start_price === 0 && b.start_price !== 0) return 1;
        if (b.start_price === 0 && a.start_price !== 0) return -1;
        return a.start_price - b.start_price;
      });
    } else if (sort === 'desc') {
      dorms.sort((a, b) => b.start_price - a.start_price);
    }

    const tempSelected = this.tempSelectedDormIds();
    if (tempSelected.length > 0) {
      dorms.sort((a, b) => {
        const aSelected = tempSelected.includes(a.DORM_ID);
        const bSelected = tempSelected.includes(b.DORM_ID);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return 0;
      });
    }

    return dorms;
  });

  constructor(
    private dormSv: DormServices,
    private authSv: AuthenService,
    private gMapSv: GoogleMapService,
    private navctrl: NavController,
    private toastCtrl: ToastController
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
      ellipsisHorizontal,
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
      reorderThreeOutline,
      cubeOutline,
    });
  }

  ngOnInit() {
    this.userSub = this.authSv.user$.subscribe((user) => {
      const isLoggedIn = !!user;
      this.maxDorms.set(isLoggedIn ? 5 : 2);
    });

    // Check for pre-selected IDs from navigation state (e.g., from My Favorites page)
    const state = history.state;
    if (state && state.preSelectedIds && Array.isArray(state.preSelectedIds)) {
      this.tempSelectedDormIds.set(state.preSelectedIds);
      this.confirmDormSelection();
    }

    this.loadAllDorms();
    this.loadZones();
    this.loadPriceTypes();
  }

  ngOnDestroy() {
    this.destroyMap();
    if (this.userSub) this.userSub.unsubscribe();
  }

  loadPriceTypes() {
    this.dormSv.getPriceTypes().subscribe({
      next: (res: any) => {
        this.priceTypes.set(Array.isArray(res) ? res : res.data || []);
      },
      error: (err) => console.error('Error fetching price types', err),
    });
  }

  loadZones() {
    this.dormSv.getZones().subscribe({
      next: (res) => {
        if (res.success) this.zones.set(res.data);
      },
      error: (err) => console.error('Error fetching zones', err),
    });
  }

  loadAllDorms() {
    this.isLoadingModal.set(true);
    this.dormSv.getDormsMobile(this.filterParams()).subscribe({
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
    this.tempSelectedDormIds.update((ids) => {
      if (isChecked) {
        if (this.selectedDorms().length + ids.length >= this.maxDorms()) {
          setTimeout(() => {
            event.target.checked = false; // revert the visually checked state
          }, 0);
          return ids;
        }
        return [...ids, dormId];
      } else {
        return ids.filter((id) => id !== dormId);
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

    const fetchPromises = idsToFetch.map((id) => {
      return new Promise<CompareDorm | null>((resolve) => {
        this.dormSv.getDormById(id).subscribe({
          next: async (res) => {
            if (res.success) {
              const newDorm: CompareDorm = { ...res.data };
              if (this.refPoint()) {
                newDorm.distance = await this.getDrivingDistance(
                  this.refPoint()!,
                  { lat: newDorm.lat, lng: newDorm.lng }
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
          },
        });
      });
    });

    Promise.all(fetchPromises)
      .then((results) => {
        const newDorms = results.filter((d) => d !== null) as CompareDorm[];
        this.selectedDorms.update((current) => {
          const combined = [...current, ...newDorms];
          combined.sort((a, b) => a.DORM_NAME.localeCompare(b.DORM_NAME, 'th'));
          return combined;
        });
        this.isLoadingDetail.set(false);
      })
      .catch((err) => {
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
        zoomControl: false,
        clickableIcons: false,
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

    this.polylines.forEach((p) => p.setMap(null));
    this.polylines = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    // =========================
    // 1. Draw Reference Point
    // =========================
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

    // =========================
    // 2. Draw Dormitories & Routes
    // =========================
    const dorms = this.selectedDorms();

    const colors = [
      '#3b82f6', // blue
      '#22c55e', // green
      '#f97316', // orange
      '#a855f7', // purple
      '#ef4444', // red
    ];

    dorms.forEach((dorm, index) => {
      const dormPos = {
        lat: dorm.lat,
        lng: dorm.lng,
      };

      // -------------------------
      // Dorm Marker
      // -------------------------
      const marker = new google.maps.Marker({
        position: dormPos,
        map: this.map,
        title: dorm.DORM_NAME,
        icon: {
          url: 'assets/icon/home.png',
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40),
        },
        zIndex: 50,
      });

      this.dormMarkers.push(marker);

      bounds.extend(dormPos);
      hasPoints = true;

      // -------------------------
      // Route
      // -------------------------
      if (ref && this.dirService) {
        const req: google.maps.DirectionsRequest = {
          origin: ref,
          destination: dormPos,
          travelMode: google.maps.TravelMode.DRIVING,
        };

        this.dirService.route(req, (result: any, status: any) => {
          if (status === 'OK' && result) {
            const color = colors[index % colors.length];

            // ==================================
            // Directions Renderer
            // ==================================
            const renderer = new google.maps.DirectionsRenderer({
              map: this.map,
              suppressMarkers: true,
              preserveViewport: true,
              suppressPolylines: true, // IMPORTANT
            });

            renderer.setDirections(result);

            this.dirRenderers.push(renderer);

            // ==================================
            // Route Data
            // ==================================
            const route = result.routes[0];
            const leg = route.legs[0];

            // Update Signal distance to match map (Driving Distance)
            this.selectedDorms.update((current) => {
              const updated = [...current];
              if (updated[index]) {
                updated[index] = {
                  ...updated[index],
                  distance: leg.distance.value,
                };
              }
              return updated;
            });

            // ==================================
            // Custom Polyline
            // ==================================
            const polyline = new google.maps.Polyline({
              path: route.overview_path,
              strokeColor: color,
              strokeWeight: 7,
              strokeOpacity: 0.7,
              clickable: true,
              map: this.map,
            });

            this.polylines.push(polyline);

            // ==================================
            // Toast Notification
            // ==================================
            polyline.addListener('click', async () => {
              const distanceStr =
                leg.distance?.value > 1000
                  ? (leg.distance?.value / 1000).toFixed(2) + ' กม.'
                  : leg.distance?.value + ' เมตร';

              const toast = await this.toastCtrl.create({
                message: `${dorm.DORM_NAME} ระยะทาง ${distanceStr}`,
                duration: 3000,
                position: 'bottom',
                color: 'dark',
                buttons: [
                  {
                    icon: 'close',
                    role: 'cancel',
                  },
                ],
              });
              await toast.present();
            });
          }
        });
      }
    });

    // =========================
    // Auto Fit Bounds
    // =========================
    if (hasPoints) {
      this.map.fitBounds(bounds);

      // Prevent zooming too much
      const listener = google.maps.event.addListener(this.map, 'idle', () => {
        if (this.map.getZoom()! > 16) {
          this.map.setZoom(16);
        }

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
    this.polylines.forEach((p) => p.setMap(null));
    this.polylines = [];
    this.dirService = null;
    this.map = null;
  }

  confirmMapSelection() {
    if (this.refPoint()) this.recalculateDistances();
    this.closeMapModal();
  }

  getRoomStartPrice(r: any): string {
    if (r.PRICE > 0) return `${this.formatNumber(r.PRICE)} บาท/เดือน`;
    if (r.perTerm > 0) return `${this.formatNumber(r.perTerm)} บาท/เทอม`;
    if (r.perDay > 0) return `${this.formatNumber(r.perDay)} บาท/วัน`;
    return '-';
  }

  getDormStartPriceObj(dorm: any): { price: string; unit: string } {
    if (dorm.start_price > 0) {
      return { price: this.formatNumber(dorm.start_price), unit: 'บาท/เดือน' };
    }

    if (dorm.rooms && dorm.rooms.length > 0) {
      let minPrice = Infinity;
      let unit = '';

      for (const r of dorm.rooms) {
        if (r.PRICE > 0 && r.PRICE < minPrice) {
          minPrice = r.PRICE;
          unit = 'บาท/เดือน';
        }
        if (r.perTerm > 0 && r.perTerm < minPrice) {
          minPrice = r.perTerm;
          unit = 'บาท/เทอม';
        }
        if (r.perDay > 0 && r.perDay < minPrice) {
          minPrice = r.perDay;
          unit = 'บาท/วัน';
        }
      }

      if (minPrice !== Infinity) {
        return { price: this.formatNumber(minPrice), unit };
      }
    }

    return { price: '-', unit: '' };
  }

  formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  getDistanceKm(distance: number): number {
    return Math.floor(distance / 1000);
  }

  getDistanceObj(distance: number): { value: string; unit: string } {
    if (distance >= 1000) {
      return { value: (distance / 1000).toFixed(2), unit: 'กิโลเมตร' };
    }
    return { value: this.formatNumber(distance), unit: 'เมตร' };
  }

  async recalculateDistances() {
    const point = this.refPoint();
    if (!point) return;

    const currentDorms = this.selectedDorms();
    const updatedDorms = [...currentDorms];

    for (let i = 0; i < updatedDorms.length; i++) {
      const dorm = updatedDorms[i];
      updatedDorms[i] = {
        ...dorm,
        distance: await this.getDrivingDistance(point, {
          lat: dorm.lat,
          lng: dorm.lng,
        }),
      };
    }

    this.selectedDorms.set(updatedDorms);
  }

  async getDrivingDistance(origin: any, destination: any): Promise<number> {
    try {
      await this.gMapSv.load();
      const service = new google.maps.DirectionsService();

      const req: google.maps.DirectionsRequest = {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      };

      return new Promise((resolve) => {
        service.route(req, (result: any, status: any) => {
          if (status === 'OK' && result) {
            resolve(result.routes[0].legs[0].distance.value);
          } else {
            // Fallback to Haversine if Directions fails
            resolve(
              this.calculateDistance(
                origin.lat,
                origin.lng,
                destination.lat,
                destination.lng
              )
            );
          }
        });
      });
    } catch (e) {
      return this.calculateDistance(
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
      );
    }
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

  goBack() {
    this.navctrl.back();
  }
}
