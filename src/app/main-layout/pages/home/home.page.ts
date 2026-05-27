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
  effect
} from '@angular/core';
import {
  IonContent,
  ViewDidEnter,
  ViewDidLeave,
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
  IonIcon
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
import { FilterGroupComponent, FilterParams } from '../../components/filter-group/filter-group.component';
import { MainLayoutPage } from '../../main-layout.page';
import { addIcons } from 'ionicons';
import { star, locationOutline, timeOutline, closeOutline, bookmarkOutline, navigateOutline, pinOutline, chevronForwardOutline, location } from 'ionicons/icons';
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
    IonIcon
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements ViewDidEnter, ViewDidLeave, OnDestroy {
  @ViewChild('map', { static: false }) mapEl!: ElementRef<HTMLElement>;

  newMap!: GoogleMap;
  currentMarkerIds: string[] = [];
  currentCircleIds: string[] = []; // Track map circles
  pinMarkerId: string | null = null; // Track the search pin marker
  
  // Use a Map for reliable marker -> dorm lookup
  private markerMap = new Map<string, DormSummary>();
  private isUpdatingMarkers = false; // Guard for concurrent updates
  
  dorms = signal<DormSummary[]>([]);
  selectedDorm = signal<DormSummary | null>(null);
  sheetOpen = signal(false);
  isLoading = signal(false);
  mapReady = signal(false); // New signal to track map initialization

  // Filter & Pin State
  zones = signal<DormZone[]>([]);
  searchQuery = signal<string>('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  selectedZone = signal<string | null>(null);
  
  isPinMode = signal(false);
  pinnedLocation = signal<{lat: number, lng: number} | null>(null);

  // Default Center (MSU Khamrieng)
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
    addIcons({ star, location, timeOutline, closeOutline, bookmarkOutline, navigateOutline, pinOutline, chevronForwardOutline });

    // Automatically update map markers when dorms data OR map readiness changes
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
        if (event.urlAfterRedirects === '/home' || event.urlAfterRedirects === '/') {
          // If we navigate back to home, trigger a full reload
          this.forceReload();
        } else {
           this.cleanupMapAndView();
        }
      });
  }

  isOpenMenu() {
    return this.mainLayout.isOpenMenu();
  }

  ionViewDidEnter() {
    this.forceReload();
  }

  ionViewDidLeave() {
     this.cleanupMapAndView();
  }

  async forceReload() {
    // Reset state
    this.sheetOpen.set(false);
    this.selectedDorm.set(null);
    this.mapReady.set(false); // Reset readiness
    this.isPinMode.set(false);
    this.pinnedLocation.set(null);
    this.mainLayout.hideFooter.set(false);
    
    // Clean up existing map if any
    if (this.newMap) {
      await this.newMap.destroy().catch(e => console.error('Failed to destroy map:', e));
      // @ts-ignore
      this.newMap = null;
      this.currentMarkerIds = [];
      this.currentCircleIds = [];
      this.pinMarkerId = null;
    }

    this.loadDorms();
    this.loadZones();
  }

  cleanupMapAndView() {
    this.renderer.removeClass(document.body, 'map-view-active');
    this.mapReady.set(false); // Reset readiness
    this.mainLayout.hideFooter.set(false);
    
    if (this.newMap) {
      this.newMap.destroy().catch(e => console.error('Failed to destroy map on leave:', e));
      // @ts-ignore
      this.newMap = null;
      this.currentMarkerIds = [];
      this.currentCircleIds = [];
      this.pinMarkerId = null;
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

    if (pin) {
       params.lat = pin.lat;
       params.lng = pin.lng;
       params.radius = this.FILTER_RADIUS_KM;
       centerLat = pin.lat;
       centerLng = pin.lng;
    } else if (selectedZoneId) {
       const zoneObj = this.zones().find(z => z.ZONE_ID.toString() === selectedZoneId);
       if (zoneObj) {
         params.zone = zoneObj.ZONE_NAME;
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
            // Update signal (will trigger effect if mapReady is true)
            this.zone.run(() => {
              this.dorms.set(res.data);
            });

            // Ensure map is initialized
            setTimeout(async () => {
              await this.initMap();
              
              if (pin || selectedZoneId) {
                 await this.updateMapCircle(centerLat, centerLng, this.FILTER_RADIUS_KM);
              } else {
                 await this.clearMapCircle();
              }
            }, 50);
          } else {
            console.error('API response format error:', res);
          }
        },
        error: (err) => {
          console.error('Error fetching dorms:', err);
        },
      });
  }

  loadZones() {
    this.dormService.getZones().subscribe({
      next: (res) => {
        if (res.success) {
          this.zones.set(res.data);
        }
      },
      error: (err) => console.error('Error fetching zones', err),
    });
  }

  handleFilterApplied(params: FilterParams) {
    this.searchQuery.set(params.search || '');
    this.minPrice.set(params.minPrice !== undefined ? params.minPrice : null);
    this.maxPrice.set(params.maxPrice !== undefined ? params.maxPrice : null);
    this.selectedZone.set(params.zone || null);
    
    this.clearPin(false); // Correctly remove pin marker and reset pin state
    
    this.sheetOpen.set(false);
    this.loadDorms();
  }

  togglePinMode() {
    const newVal = !this.isPinMode();
    this.isPinMode.set(newVal);
    this.mainLayout.hideFooter.set(newVal);
    this.sheetOpen.set(false);
    
    if (newVal) {
      this.clearPin(false); // Clear existing search results/pin marker but stay in pin mode
    }
  }

  clearPin(reload = true) {
    this.pinnedLocation.set(null);
    this.isPinMode.set(reload ? false : this.isPinMode());
    this.mainLayout.hideFooter.set(this.isPinMode());
    
    if (this.newMap && this.pinMarkerId) {
       this.newMap.removeMarker(this.pinMarkerId).catch(e => console.error(e));
       this.pinMarkerId = null;
    }

    if (reload) {
      this.selectedZone.set(null);
      this.searchQuery.set('');
      this.minPrice.set(null);
      this.maxPrice.set(null);
      this.loadDorms();
    }
  }

  clearZoneFilter() {
    this.selectedZone.set(null);
    this.loadDorms();
  }

  goToDormDetail(id: number) {
    this.router.navigate(['/dorm', id]); // Adjust the route as per your app setup
  }

  toggleFavorite(event: Event, dorm: DormSummary) {
    event.stopPropagation();
    console.log('Toggle favorite for:', dorm.DORM_NAME);
    // Implement actual favorite logic here later
  }

  async initMap() {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Native Google Maps is designed for iOS/Android.');
      return;
    }

    try {
      if (!this.newMap) {
        if (!this.mapEl?.nativeElement) {
            console.error('Map element not found!');
            return;
        }

        this.newMap = await GoogleMap.create({
          id: 'my-map',
          element: this.mapEl.nativeElement,
          apiKey: environment.GGMAPI, 
          config: {
            center: {
              lat: this.DEFAULT_LAT,
              lng: this.DEFAULT_LNG,
            },
            zoom: 14,
            disableDefaultUI: true,
            clickableIcons: false, 
            styles: [
              {
                featureType: "all",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }],
              },
            ],
          },
        });
        
        this.renderer.addClass(document.body, 'map-view-active');
        await this.newMap.enableCurrentLocation(false).catch(e => console.error(e));

        // Listen for map clicks
        await this.newMap.setOnMapClickListener(async (data) => {
          this.zone.run(async () => {
            if (this.isPinMode()) {
               const lat = data.latitude;
               const lng = data.longitude;
               
               this.pinnedLocation.set({ lat, lng });
               this.isPinMode.set(false);
               this.mainLayout.hideFooter.set(false);
if (this.pinMarkerId) {
   await this.newMap.removeMarker(this.pinMarkerId);
}

const ids = await this.newMap.addMarkers([{
   coordinate: { lat, lng },
   title: 'จุดที่ค้นหา',
   iconUrl: 'assets/icon/map-pin.png',
   iconSize: { width: 50, height: 50 },
   zIndex: 10 // Pinned location lower than dorms
}]);
this.pinMarkerId = ids[0];

               this.loadDorms();
            } else {
               this.sheetOpen.set(false);
            }
          });
        });

        // Listen for marker clicks (Set ONCE in initMap)
        await this.newMap.setOnMarkerClickListener(async (marker) => {
          this.zone.run(() => {
            if (marker.markerId === this.pinMarkerId) return;

            const selected = this.markerMap.get(marker.markerId);
            if (selected) {
               this.selectedDorm.set(selected);
               this.sheetOpen.set(true);
               
               this.newMap.setCamera({
                 coordinate: { lat: selected.lat, lng: selected.lng },
                 animate: true
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
    }
  }

  async updateMapCircle(lat: number, lng: number, radiusKm: number) {
    if (!this.newMap) return;
    try {
      await this.clearMapCircle(false);
      
      this.currentCircleIds = await this.newMap.addCircles([{
        center: { lat, lng },
        radius: radiusKm * 1000,
        fillColor: '#FFCC00', 
        fillOpacity: 0.25,     
        strokeColor: '#FFCC00',
        strokeWeight: 2,
      }]);

      await this.newMap.setCamera({
        coordinate: { lat, lng },
        zoom: 15, 
        animate: true
      });
    } catch (error) {
      console.error('Error drawing circle:', error);
    }
  }

  async clearMapCircle(resetCamera = true) {
    if (!this.newMap) return;
    try {
      if (this.currentCircleIds.length > 0) {
        await this.newMap.removeCircles(this.currentCircleIds);
        this.currentCircleIds = [];
      }
      
      if (resetCamera) {
        await this.newMap.setCamera({
          coordinate: { lat: this.DEFAULT_LAT, lng: this.DEFAULT_LNG },
          zoom: 14,
          animate: true
        });
      }
    } catch (error) {
      console.error('Error removing circle:', error);
    }
  }

  async updateMapMarkers(dormsToDisplay: DormSummary[]) {
    if (!this.newMap || this.isUpdatingMarkers) return;

    try {
      this.isUpdatingMarkers = true;

      // 1. Remove markers by IDs if they exist
      if (this.currentMarkerIds.length > 0) {
        await this.newMap.removeMarkers(this.currentMarkerIds).catch(e => console.error('Error removing markers:', e));
        this.currentMarkerIds = []; 
        this.markerMap.clear();
      }

      // 2. Prepare new marker data
      const markersData = dormsToDisplay.map((dorm) => ({
        coordinate: {
          lat: dorm.lat,
          lng: dorm.lng,
        },
        iconUrl: 'assets/icon/home.png',
        iconSize: { width: 50, height: 50 },
      
        zIndex: 100 // Ensure they are on top of the search pin
      }));

      // 3. Add markers and store their new IDs in the Map for lookup
      if (markersData.length > 0) {
        this.currentMarkerIds = await this.newMap.addMarkers(markersData);
        
        // Link returned marker IDs to our dorm objects
        this.currentMarkerIds.forEach((id, idx) => {
          this.markerMap.set(id, dormsToDisplay[idx]);
        });
      }
    } catch (error) {
       console.error('Error updating map markers:', error);
    } finally {
      this.isUpdatingMarkers = false;
    }
  }

  ngOnDestroy() {
    this.cleanupMapAndView();
    if(this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }
}
