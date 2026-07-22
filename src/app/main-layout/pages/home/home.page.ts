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
  computed,
  untracked,
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
  IonImg,
  ToastController,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DormSummary, DormZone, FilterParams } from 'src/app/model/dorm.model';
import { DormServices, DormQueryParams } from 'src/app/services/dormServices';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { filter, finalize, Subscription } from 'rxjs';
import { GoogleMap } from '@capacitor/google-maps';
import { Capacitor } from '@capacitor/core';
import { FilterGroupComponent } from '../../components/filter-group/filter-group.component';
import { MainLayoutPage } from '../../main-layout.page';
import { addIcons } from 'ionicons';
import {
  star,
  locationOutline,
  timeOutline,
  closeOutline,
  bookmarkOutline,
  bookmark,
  navigateOutline,
  pinOutline,
  chevronForwardOutline,
  location,
  chevronDown,
} from 'ionicons/icons';
import { environment } from 'src/environments/environment';
import { GoogleMapService } from 'src/app/services/google-map-service';

declare var google: any;

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
    IonImg,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements ViewWillEnter, ViewWillLeave, OnDestroy {
  @ViewChild('map', { static: false }) mapEl!: ElementRef<HTMLElement>;

  newMap!: GoogleMap;
  dirService: any;
  currentMarkerIds: string[] = [];
  currentCircleIds: string[] = [];
  currentPolylineIds: string[] = [];
  pinMarkerId: string | null = null;

  private markerMap = new Map<string, DormSummary>();
  private isUpdatingMarkers = false;
  private pendingMarkersUpdate: DormSummary[] | null = null;
  private isInitializingMap = false;
  private isDestroyingMap = false;

  private allDorms = signal<DormSummary[]>([]);
  favIds = this.userSv.favIds;

  dorms = computed(() => {
    const raw = this.allDorms();
    const favs = this.favIds();
    let result = raw.map((d) => ({
      ...d,
      isFavorite: favs.includes(d.DORM_ID),
    }));

    const sortName = this.sortByName();
    if (sortName === 'asc') {
      result.sort((a, b) => a.DORM_NAME.localeCompare(b.DORM_NAME, 'th'));
    } else if (sortName === 'desc') {
      result.sort((a, b) => b.DORM_NAME.localeCompare(a.DORM_NAME, 'th'));
    }

    const sort = this.sortByPrice();
    if (sort === 'asc') {
      result.sort((a, b) => {
        if (a.start_price === 0 && b.start_price !== 0) return 1;
        if (b.start_price === 0 && a.start_price !== 0) return -1;
        return a.start_price - b.start_price;
      });
    } else if (sort === 'desc') {
      result.sort((a, b) => b.start_price - a.start_price);
    }

    return result;
  });

  selectedDormRaw = signal<DormSummary | null>(null);
  selectedDorm = computed(() => {
    const selected = this.selectedDormRaw();
    if (!selected) return null;
    return {
      ...selected,
      isFavorite: this.favIds().includes(selected.DORM_ID),
    };
  });

  sheetOpen = signal(false);
  isLoading = signal(false);
  mapReady = signal(false);

  zones = signal<DormZone[]>([]);
  searchQuery = signal<string>('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  selectedZone = signal<string | null>(null);
  selectedScore = signal<number | null>(null);
  maxWater = signal<number | null>(null);
  maxElect = signal<number | null>(null);
  sortByPrice = signal<string>('');
  sortByName = signal<string>('');

  isPinMode = signal(false);
  pinnedLocation = signal<{ lat: number; lng: number } | null>(null);
  zoneLabel = signal<string>('');
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
  private userSub?: Subscription;
  currentUser: any = null;

  constructor(
    private dormService: DormServices,
    private userSv: UserServices,
    private authSv: AuthenService,
    private router: Router,
    private zone: NgZone,
    private renderer: Renderer2,
    private toastCtrl: ToastController,
    public mainLayout: MainLayoutPage,
    private gMapSv: GoogleMapService
  ) {
    addIcons({
      star,
      locationOutline,
      timeOutline,
      closeOutline,
      bookmarkOutline,
      bookmark,
      navigateOutline,
      pinOutline,
      chevronForwardOutline,
      chevronDown,
    });

    effect(() => {
      this.allDorms();
      const ready = this.mapReady();
      if (ready) {
        const dormsToDisplay = untracked(() => this.dorms());
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
    this.selectedScore.set(null);
    this.maxWater.set(null);
    this.maxElect.set(null);
    this.sortByPrice.set('');
    this.sortByName.set('asc');
  }

  isOpenMenu() {
    return this.mainLayout.isOpenMenu();
  }

  // 🌟 ก่อนหน้าจะแสดงผล: สร้างแผนที่ขึ้นมาใหม่
  ionViewWillEnter() {
    this.userSub = this.authSv.user$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadFavIds();
      } else {
        this.favIds.set([]);
      }
    });
    this.forceReload();
  }

  // 🌟 ก่อนจะเปลี่ยนหน้าไปที่อื่น: สั่งทำลายแผนที่ล่วงหน้าเพื่อคืน Resource ให้ Native Bridge
  ionViewWillLeave() {
    if (this.userSub) this.userSub.unsubscribe();
    this.cleanupMapAndView();
  }

  loadFavIds() {
    if (!this.currentUser) return;
    this.userSv.loadFavIds(this.currentUser.id);
  }

  async forceReload() {
    this.resetFilters();

    this.sheetOpen.set(false);
    this.selectedDormRaw.set(null);
    this.mapReady.set(false);
    this.isPinMode.set(false);
    this.pinnedLocation.set(null);
    this.mainLayout.hideFooter.set(false);

    if (this.newMap && !this.isDestroyingMap) {
      this.isDestroyingMap = true;
      try {
        await this.newMap.destroy();
      } catch (e: any) {
        if (!e?.message?.includes('Map not found')) {
          console.error('Failed to destroy map:', e);
        }
      } finally {
        // @ts-ignore
        this.newMap = null;
        this.currentMarkerIds = [];
        this.currentCircleIds = [];
        this.currentPolylineIds = [];
        this.pinMarkerId = null;
        this.markerMap.clear();
        this.pendingMarkersUpdate = null;
        this.isDestroyingMap = false;
      }
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

    if (this.newMap && !this.isDestroyingMap) {
      this.isDestroyingMap = true;
      try {
        await this.newMap.destroy();
      } catch (e: any) {
        if (!e?.message?.includes('Map not found')) {
          console.error('Failed to destroy map on leave:', e);
        }
      } finally {
        // @ts-ignore
        this.newMap = null;
        this.currentMarkerIds = [];
        this.currentCircleIds = [];
        this.currentPolylineIds = [];
        this.pinMarkerId = null;
        this.markerMap.clear();
        this.pendingMarkersUpdate = null;
        this.isDestroyingMap = false;
      }
    }
  }

  async loadDorms() {
    this.isLoading.set(true);

    const params: DormQueryParams = {};

    if (this.searchQuery()) params.search = this.searchQuery();
    if (this.minPrice() !== null) params.minPrice = this.minPrice();
    if (this.maxPrice() !== null) params.maxPrice = this.maxPrice();
    if (this.selectedScore() !== null) params.score = this.selectedScore();
    if (this.maxWater() !== null) params.maxWater = this.maxWater();
    if (this.maxElect() !== null) params.maxElect = this.maxElect();
    if (this.sortByPrice()) params.sortByPrice = this.sortByPrice();

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
      .getDormsMobile(params)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: async (res) => {
          if (res.success && Array.isArray(res.data)) {
            this.zone.run(() => {
              this.allDorms.set(res.data);
            });

            setTimeout(async () => {
              await this.initMap();

              if (pin || selectedZoneId) {
                await this.updateMapCircle(centerLat, centerLng, currentRadius);

                if (selectedZoneId && !pin) {
                  if (this.pinMarkerId) {
                    await this.newMap
                      .removeMarker(this.pinMarkerId)
                      .catch(() => {});
                  }

                  const zoneObj = this.zones().find(
                    (z) => z.ZONE_ID.toString() === selectedZoneId.toString()
                  );
                  const zoneName = zoneObj ? zoneObj.ZONE_NAME : 'โซนที่เลือก';

                  // Show the floating label
                  this.zoneLabel.set(zoneName);

                  const ids = await this.newMap.addMarkers([
                    {
                      coordinate: { lat: centerLat, lng: centerLng },
                      title: zoneName,
                      iconUrl: 'assets/icon/map-pin.png',
                      iconSize: { width: 40, height: 40 },
                      iconAnchor: { x: 20, y: 40 },
                      zIndex: 10,
                    },
                  ]);
                  this.pinMarkerId = ids[0];
                }
              } else {
                const hasDorms = res.data && res.data.length > 0;
                const isFiltering =
                  !!this.searchQuery() ||
                  this.minPrice() !== null ||
                  this.maxPrice() !== null ||
                  this.selectedScore() !== null ||
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
    this.selectedScore.set(params.score !== undefined ? params.score : null);
    this.maxWater.set(params.maxWater !== undefined ? params.maxWater : null);
    this.maxElect.set(params.maxElect !== undefined ? params.maxElect : null);
    this.sortByPrice.set(params.sortByPrice || '');
    this.sortByName.set(params.sortByName || 'asc');
    this.zoneLabel.set('');

    this.clearPin(false);

    if (
      !this.searchQuery() &&
      this.minPrice() === null &&
      this.maxPrice() === null &&
      this.selectedScore() === null &&
      !this.selectedZone() &&
      this.maxWater() === null &&
      this.maxElect() === null &&
      !this.sortByPrice() &&
      this.sortByName() === 'asc'
    ) {
      this.sheetOpen.set(false);
      this.selectedDormRaw.set(null);
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
    this.zoneLabel.set('');
    this.isPinMode.set(reload ? false : this.isPinMode());
    this.mainLayout.hideFooter.set(this.isPinMode());

    if (this.newMap && this.pinMarkerId) {
      this.newMap.removeMarker(this.pinMarkerId).catch((e) => console.error(e));
      this.pinMarkerId = null;
    }

    if (this.newMap && this.currentPolylineIds.length > 0) {
      this.newMap
        .removePolylines(this.currentPolylineIds)
        .catch((e) => console.error(e));
      this.currentPolylineIds = [];
    }

    if (reload) {
      this.selectedZone.set(null);
      this.searchQuery.set('');
      this.minPrice.set(null);
      this.maxPrice.set(null);
      this.selectedScore.set(null);
      this.sheetOpen.set(false);
      this.selectedDormRaw.set(null);

      this.loadDorms();
    }
  }

  clearZoneFilter() {
    this.selectedZone.set(null);
    this.loadDorms();
  }

  goToDormDetail(id: number) {
    this.router.navigate(['/dorm-detail', id]);
  }

  toggleFavorite(event: Event, dorm: DormSummary) {
    event.stopPropagation();
    if (!this.currentUser) {
      this.showToast('กรุณาเข้าสู่ระบบเพื่อเพิ่มรายการโปรด', 'warning');
      return;
    }

    const currentFavs = this.favIds();
    const isFav = currentFavs.includes(dorm.DORM_ID);

    if (isFav) {
      this.userSv.removeFavorite(dorm.DORM_ID).subscribe({
        next: () => {
          this.favIds.set(currentFavs.filter((id) => id !== dorm.DORM_ID));
          this.showToast('ลบออกจากรายการโปรดแล้ว', 'success');
        },
        error: (err) => console.error(err),
      });
    } else {
      this.userSv.addFavorite(dorm.DORM_ID).subscribe({
        next: () => {
          this.favIds.set([...currentFavs, dorm.DORM_ID]);
          this.showToast('เพิ่มลงในรายการโปรดแล้ว', 'success');
        },
        error: (err) => console.error(err),
      });
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
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

        await this.gMapSv.load();
        this.dirService = new google.maps.DirectionsService();

        this.newMap = await GoogleMap.create({
          id: 'my-map',
          element: this.mapEl.nativeElement,
          apiKey: environment.GGMAPI,
          config: {
            center: { lat: this.DEFAULT_LAT, lng: this.DEFAULT_LNG },
            zoom: 14,
            disableDefaultUI: true,
            clickableIcons: false,
            styles: [
              { elementType: 'labels', stylers: [{ visibility: 'off' }] },
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'off' }] },
              {
                featureType: 'administrative',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
              {
                featureType: 'road',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
          },
        });

        this.renderer.addClass(document.body, 'map-view-active');
        await this.newMap
          .enableCurrentLocation(false)
          .catch((e) => console.error(e));

        await this.newMap.setOnMapClickListener((event) => {
          this.zone.run(() => {
            if (this.isPinMode()) {
              this.handlePinAction(event.latitude, event.longitude);
            } else {
              this.sheetOpen.set(false);
            }
          });
        });

        await this.newMap.setOnCameraMoveStartedListener(() => {
          if (this.zoneLabel()) {
            this.zone.run(() => this.zoneLabel.set(''));
          }
        });

        await this.newMap.setOnPolylineClickListener(async (data) => {
          this.zone.run(() => {
            if (data.tag) {
              this.showToast(data.tag, 'primary');
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
              this.selectedDormRaw.set(selected);
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

      if (this.currentPolylineIds.length > 0) {
        await this.newMap
          .removePolylines(this.currentPolylineIds)
          .catch((e) => console.error('Error removing polylines:', e));
      }

      this.currentMarkerIds = [];
      this.currentPolylineIds = [];
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

        const pin = this.pinnedLocation();
        if (pin && this.dirService) {
          const newPolylineIds: string[] = [];
          for (const dorm of dormsToDisplay) {
            const req = {
              origin: pin,
              destination: { lat: dorm.lat, lng: dorm.lng },
              travelMode: google.maps.TravelMode.DRIVING,
            };

            try {
              const result = await new Promise<any>((resolve, reject) => {
                this.dirService.route(req, (res: any, status: any) => {
                  if (status === 'OK') resolve(res);
                  else reject(status);
                });
              });

              if (result && result.routes && result.routes[0]) {
                const route = result.routes[0];
                const path = route.overview_path.map((p: any) => ({
                  lat: typeof p.lat === 'function' ? p.lat() : p.lat,
                  lng: typeof p.lng === 'function' ? p.lng() : p.lng,
                }));

                const r = Math.floor(Math.random() * 256 + 100);
                const g = Math.floor(Math.random() * 256 + 100);
                const b = Math.floor(Math.random() * 256 + 100);
                const randomHexColor = `#${r.toString(16).padStart(2, '0')}${g
                  .toString(16)
                  .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

                const distanceMeters =
                  route.legs && route.legs.length > 0 && route.legs[0].distance
                    ? route.legs[0].distance.value
                    : 0;

                const polylineIds = await this.newMap.addPolylines([
                  {
                    path: path,
                    strokeColor: randomHexColor,
                    strokeWeight: 4,
                    strokeOpacity: 0.7,
                    clickable: true,
                    tag: `หอพัก${dorm.DORM_NAME} ระยะทาง ${distanceMeters} เมตร`,
                  },
                ]);
                newPolylineIds.push(...(polylineIds || []));
              }
            } catch (err) {
              console.error('DirectionsService route error:', err);
            }
          }
          this.currentPolylineIds = newPolylineIds;
        }
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
      score: this.selectedScore() !== null ? this.selectedScore() : undefined,
      maxWater: this.maxWater(),
      maxElect: this.maxElect(),
      sortByPrice: this.sortByPrice(),
      sortByName: this.sortByName(),
    };
  }

  onRadiusChange(val: any) {
    this.selectedRadius.set(val);
    this.currentRadius = val;
    this.loadDorms();
  }

  formatThaiDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    
    return `${day} ${month} ${year}`;
  }

  ngOnDestroy() {
    this.cleanupMapAndView();
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }
}
