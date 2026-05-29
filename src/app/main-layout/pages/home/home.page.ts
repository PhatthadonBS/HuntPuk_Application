import {
  Component,
  ElementRef,
  NgZone,
  signal,
  ViewChild,
  OnDestroy,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  Renderer2,
  effect,
} from '@angular/core';
import {
  IonContent,
  ViewWillEnter,
  ViewWillLeave,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonRow,
  IonCol,
  IonIcon,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DormSummary, DormZone } from 'src/app/model/dorm.model';
import { DormServices, DormQueryParams } from 'src/app/services/dormServices';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { filter, finalize, Subscription } from 'rxjs';
import { GoogleMap } from '@capacitor/google-maps';
import { Capacitor } from '@capacitor/core';
import {
  FilterGroupComponent,
  FilterParams,
} from '../../components/filter-group/filter-group.component';
import { MainLayoutPage } from '../../main-layout.page';
import { addIcons } from 'ionicons';
import {
  star,
  locationOutline,
  timeOutline,
  closeOutline,
  bookmarkOutline,
  navigateOutline,
  pinOutline,
  chevronForwardOutline,
  location,
  chevronDown,
} from 'ionicons/icons';
import { environment } from 'src/environments/environment';

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
    FilterGroupComponent,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonRow,
    IonCol,
    IonIcon,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements ViewWillEnter, ViewWillLeave, OnDestroy {
  @ViewChild('map', { static: false }) mapEl!: ElementRef<HTMLElement>;

  newMap!: GoogleMap;
  currentMarkerIds: string[] = [];
  currentCircleIds: string[] = [];
  pinMarkerId: string | null = null;

  private markerMap = new Map<string, DormSummary>();
  private isUpdatingMarkers = false;
  private pendingMarkersUpdate: DormSummary[] | null = null;
  private isInitializingMap = false;

  dorms = signal<DormSummary[]>([]);
  selectedDorm = signal<DormSummary | null>(null);
  sheetOpen = signal(false);
  isLoading = signal(false);
  mapReady = signal(false);

  zones = signal<DormZone[]>([]);
  searchQuery = signal<string>('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  selectedZone = signal<string | null>(null);

  isPinMode = signal(false);
  pinnedLocation = signal<{ lat: number; lng: number } | null>(null);
  selectedRadius = signal<number>(0.5);
  currentRadius: number = 0.5;
  readonly radiusOptions = [
    { value: 0.5, label: '500 ม.' },
    { value: 1, label: '1 กม.' },
    { value: 2, label: '2 กม.' },
    { value: 3, label: '3 กม.' },
    { value: 4, label: '4 กม.' },
    { value: 5, label: '5 กม.' },
  ];

  readonly DEFAULT_LAT = 16.2458428;
  readonly DEFAULT_LNG = 103.2500078;
  readonly FILTER_RADIUS_KM = 0.5;

  private routerSub: Subscription;

  constructor(
    private dormService: DormServices,
    private router: Router,
    private zone: NgZone,
    private renderer: Renderer2,
    public mainLayout: MainLayoutPage
  ) {
    addIcons({
      star,
      location,
      timeOutline,
      closeOutline,
      bookmarkOutline,
      navigateOutline,
      pinOutline,
      chevronForwardOutline,
      chevronDown,
    });

    effect(() => {
      const dormsToDisplay = this.dorms();
      const ready = this.mapReady();
      if (ready) {
        this.updateMapMarkers(dormsToDisplay);
      }
    });

    this.routerSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (
          event.urlAfterRedirects === '/home' ||
          event.urlAfterRedirects === '/'
        ) {
          this.forceReload();
        } else {
          this.cleanupMapAndView();
        }
      });
  }

  private resetFilters() {
    this.searchQuery.set('');
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.selectedZone.set(null);
  }

  isOpenMenu() {
    return this.mainLayout.isOpenMenu();
  }

  // 🌟 ก่อนหน้าจะแสดงผล: สร้างแผนที่ขึ้นมาใหม่
  ionViewWillEnter() {
    this.forceReload();
  }

  // 🌟 ก่อนจะเปลี่ยนหน้าไปที่อื่น: สั่งทำลายแผนที่ล่วงหน้าเพื่อคืน Resource ให้ Native Bridge
  ionViewWillLeave() {
    this.cleanupMapAndView();
  }

  async forceReload() {
    this.resetFilters();

    this.sheetOpen.set(false);
    this.selectedDorm.set(null);
    this.mapReady.set(false);
    this.isPinMode.set(false);
    this.pinnedLocation.set(null);
    this.mainLayout.hideFooter.set(false);

    if (this.newMap) {
      await this.newMap
        .destroy()
        .catch((e) => console.error('Failed to destroy map:', e));
      // @ts-ignore
      this.newMap = null;
      this.currentMarkerIds = [];
      this.currentCircleIds = [];
      this.pinMarkerId = null;
      this.markerMap.clear();
      this.pendingMarkersUpdate = null;
    }

    this.dormService.getZones().subscribe({
      next: (res) => {
        if (res.success) {
          this.zones.set(res.data);
          this.loadDorms();
        }
      },
      error: (err) => {
        console.error('Error fetching zones', err);
        this.loadDorms();
      },
    });
  }

  async cleanupMapAndView() {
    this.renderer.removeClass(document.body, 'map-view-active');
    this.mapReady.set(false);
    this.mainLayout.hideFooter.set(false);

    if (this.newMap) {
      try {
        await this.newMap.destroy();
      } catch (e) {
        console.error('Failed to destroy map on leave:', e);
      } finally {
        // @ts-ignore
        this.newMap = null;
        this.currentMarkerIds = [];
        this.currentCircleIds = [];
        this.pinMarkerId = null;
        this.markerMap.clear();
        this.pendingMarkersUpdate = null;
      }
    }
  }

  async loadDorms() {
    this.isLoading.set(true);

    const params: DormQueryParams = {};

    if (this.searchQuery()) params.search = this.searchQuery();
    if (this.minPrice() !== null) params.minPrice = this.minPrice();
    if (this.maxPrice() !== null) params.maxPrice = this.maxPrice();

    const selectedZoneId = this.selectedZone();
    const pin = this.pinnedLocation();

    let centerLat = this.DEFAULT_LAT;
    let centerLng = this.DEFAULT_LNG;

    const currentRadius = this.selectedRadius();

    if (pin) {
      params.lat = pin.lat;
      params.lng = pin.lng;
      params.radius = currentRadius;
      centerLat = pin.lat;
      centerLng = pin.lng;
    } else if (selectedZoneId) {
      params.zone = selectedZoneId;
      params.radius = currentRadius;
      const zoneObj = this.zones().find(
        (z) => z.ZONE_ID.toString() === selectedZoneId.toString()
      );
      if (zoneObj) {
        centerLat = zoneObj.lat || this.DEFAULT_LAT;
        centerLng = zoneObj.lng || this.DEFAULT_LNG;
      }
    }

    this.dormService
      .getDorms(params)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: async (res) => {
          if (res.success && Array.isArray(res.data)) {
            this.zone.run(() => {
              this.dorms.set(res.data);
            });

            setTimeout(async () => {
              await this.initMap();

              if (pin || selectedZoneId) {
                await this.updateMapCircle(centerLat, centerLng, currentRadius);
              } else {
                const hasDorms = res.data && res.data.length > 0;
                const isFiltering =
                  !!this.searchQuery() ||
                  this.minPrice() !== null ||
                  this.maxPrice() !== null ||
                  !!this.selectedZone();

                const shouldResetCamera = !isFiltering || !hasDorms;
                await this.clearMapCircle(shouldResetCamera);

                if (isFiltering && hasDorms && this.newMap) {
                  await this.newMap.setCamera({
                    coordinate: { lat: res.data[0].lat, lng: res.data[0].lng },
                    zoom: 15,
                    animate: true,
                  });
                }
              }
            }, 50);
          } else {
            console.error('API response format error:', res);
          }
        },
        error: (err) => console.error('Error fetching dorms:', err),
      });
  }

  loadZones() {
    this.dormService.getZones().subscribe({
      next: (res) => {
        if (res.success) this.zones.set(res.data);
      },
      error: (err) => console.error('Error fetching zones', err),
    });
  }

  handleFilterApplied(params: FilterParams) {
    this.isPinMode.set(false);
    this.mainLayout.hideFooter.set(false);

    this.searchQuery.set(params.search || '');
    this.minPrice.set(params.minPrice !== undefined ? params.minPrice : null);
    this.maxPrice.set(params.maxPrice !== undefined ? params.maxPrice : null);
    this.selectedZone.set(params.zone || null);

    this.clearPin(false);

    if (
      !this.searchQuery() &&
      this.minPrice() === null &&
      this.maxPrice() === null &&
      !this.selectedZone()
    ) {
      this.sheetOpen.set(false);
      this.selectedDorm.set(null);
    }

    this.loadDorms();
  }

  togglePinMode() {
    const newVal = !this.isPinMode();
    this.isPinMode.set(newVal);
    this.mainLayout.hideFooter.set(newVal);
    this.sheetOpen.set(false);

    if (newVal) {
      this.clearPin(false);
    }
  }

  clearPin(reload = true) {
    this.pinnedLocation.set(null);
    this.isPinMode.set(reload ? false : this.isPinMode());
    this.mainLayout.hideFooter.set(this.isPinMode());

    if (this.newMap && this.pinMarkerId) {
      this.newMap.removeMarker(this.pinMarkerId).catch((e) => console.error(e));
      this.pinMarkerId = null;
    }

    if (reload) {
      this.selectedZone.set(null);
      this.searchQuery.set('');
      this.minPrice.set(null);
      this.maxPrice.set(null);
      this.sheetOpen.set(false);
      this.selectedDorm.set(null);

      this.loadDorms();
    }
  }

  clearZoneFilter() {
    this.selectedZone.set(null);
    this.loadDorms();
  }

  goToDormDetail(id: number) {
    this.router.navigate(['/dorm', id]);
  }

  toggleFavorite(event: Event, dorm: DormSummary) {
    event.stopPropagation();
    console.log('Toggle favorite for:', dorm.DORM_NAME);
  }

  async handlePinAction(lat: number, lng: number) {
    this.pinnedLocation.set({ lat, lng });
    this.isPinMode.set(false);
    this.mainLayout.hideFooter.set(false);

    if (this.pinMarkerId) {
      await this.newMap.removeMarker(this.pinMarkerId);
    }

    const ids = await this.newMap.addMarkers([
      {
        coordinate: { lat, lng },
        title: 'จุดที่ค้นหา',
        iconUrl: 'assets/icon/map-pin.png',
        iconSize: { width: 40, height: 40 },
        iconAnchor: { x: 20, y: 40 },
        zIndex: 10,
      },
    ]);
    this.pinMarkerId = ids[0];
    this.loadDorms();
  }

  async initMap() {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Native Google Maps is designed for iOS/Android.');
      return;
    }

    if (this.isInitializingMap) return;

    try {
      this.isInitializingMap = true;
      if (!this.newMap) {
        if (!this.mapEl?.nativeElement) return;

        this.newMap = await GoogleMap.create({
          id: 'my-map',
          element: this.mapEl.nativeElement,
          apiKey: environment.GGMAPI,
          config: {
            center: { lat: this.DEFAULT_LAT, lng: this.DEFAULT_LNG },
            zoom: 14,
            disableDefaultUI: false,
            clickableIcons: false,
            styles: [
              {
                featureType: 'all',
                elementType: 'labels.icon',
                stylers: [{ visibility: 'off' }],
              },
            ],
          },
        });

        this.renderer.addClass(document.body, 'map-view-active');
        await this.newMap
          .enableCurrentLocation(false)
          .catch((e) => console.error(e));

        await this.newMap.setOnMapClickListener(async (data) => {
          this.zone.run(async () => {
            if (this.isPinMode()) {
              await this.handlePinAction(data.latitude, data.longitude);
            } else {
              this.sheetOpen.set(false);
            }
          });
        });

        await this.newMap.setOnMarkerClickListener(async (marker) => {
          this.zone.run(async () => {
            if (marker.markerId === this.pinMarkerId) return;

            if (this.isPinMode()) {
              const selected = this.markerMap.get(marker.markerId);
              if (selected)
                await this.handlePinAction(selected.lat, selected.lng);
              return;
            }

            const selected = this.markerMap.get(marker.markerId);
            if (selected) {
              this.selectedDorm.set(selected);
              this.sheetOpen.set(true);

              this.newMap.setCamera({
                coordinate: { lat: selected.lat, lng: selected.lng },
                animate: true,
              });
            }
          });
        });

        this.mapReady.set(true);
      } else {
        this.mapReady.set(true);
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    } finally {
      this.isInitializingMap = false;
    }
  }

  async updateMapCircle(lat: number, lng: number, radiusKm: number) {
    if (!this.newMap) return;
    try {
      await this.clearMapCircle(false);

      const ids = await this.newMap.addCircles([
        {
          center: { lat, lng },
          radius: radiusKm * 1000,
          fillColor: '#FFCC00',
          fillOpacity: 0.25,
          strokeColor: '#FFCC00',
          strokeWeight: 2,
        },
      ]);
      this.currentCircleIds.push(...ids);

      let zoom = 17;
      if (this.selectedRadius() <= 0.5) zoom = 15.5;
      else if (this.selectedRadius() <= 1) zoom = 14.5;
      else if (this.selectedRadius() <= 2) zoom = 13.5;
      else if (this.selectedRadius() <= 3) zoom = 13;
      else if (this.selectedRadius() <= 4) zoom = 12.75;
      else zoom = 12.5;

      await this.newMap.setCamera({
        coordinate: { lat, lng },
        zoom: zoom,
        animate: true,
      });
    } catch (error) {
      console.error('Error drawing circle:', error);
    }
  }

  async clearMapCircle(resetCamera = true) {
    if (!this.newMap) return;
    try {
      if (this.currentCircleIds.length > 0) {
        const idsToRemove = [...this.currentCircleIds];
        this.currentCircleIds = [];
        await this.newMap
          .removeCircles(idsToRemove)
          .catch((e) => console.error('Remove circles error:', e));
      }

      if (resetCamera) {
        await this.newMap.setCamera({
          coordinate: { lat: this.DEFAULT_LAT, lng: this.DEFAULT_LNG },
          zoom: 14,
          animate: true,
        });
      }
    } catch (error) {
      console.error('Error removing circle:', error);
    }
  }

  async updateMapMarkers(dormsToDisplay: DormSummary[]) {
    if (!this.newMap) return;

    if (this.isUpdatingMarkers) {
      this.pendingMarkersUpdate = dormsToDisplay;
      return;
    }

    try {
      this.isUpdatingMarkers = true;

      if (this.currentMarkerIds.length > 0) {
        await this.newMap
          .removeMarkers(this.currentMarkerIds)
          .catch((e) => console.error('Error removing markers:', e));
      }

      this.currentMarkerIds = [];
      this.markerMap.clear();

      const markersData = dormsToDisplay.map((dorm) => ({
        coordinate: { lat: dorm.lat, lng: dorm.lng },
        iconUrl: 'assets/icon/home.png',
        iconSize: { width: 35, height: 35 },
        iconAnchor: { x: 17.5, y: 35 },
        zIndex: 100,
      }));

      if (markersData.length > 0) {
        this.currentMarkerIds = await this.newMap.addMarkers(markersData);

        this.currentMarkerIds.forEach((id, idx) => {
          this.markerMap.set(id, dormsToDisplay[idx]);
        });
      }
    } catch (error) {
      console.error('Error updating map markers:', error);
    } finally {
      this.isUpdatingMarkers = false;

      if (this.pendingMarkersUpdate) {
        const nextData = this.pendingMarkersUpdate;
        this.pendingMarkersUpdate = null;
        this.updateMapMarkers(nextData);
      }
    }
  }

  getFilterParams(): FilterParams {
    return {
      search: this.searchQuery(),
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      zone: this.selectedZone() || undefined,
    };
  }

  onRadiusChange(val: any) {
    this.selectedRadius.set(val);
    this.currentRadius = val;
    this.loadDorms();
  }

  ngOnDestroy() {
    this.cleanupMapAndView();
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }
}
