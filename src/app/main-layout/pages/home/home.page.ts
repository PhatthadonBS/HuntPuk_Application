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
import { star, locationOutline, timeOutline, closeOutline, bookmarkOutline } from 'ionicons/icons';

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
  
  dorms = signal<DormSummary[]>([]);
  selectedDorm = signal<DormSummary | null>(null);
  sheetOpen = signal(false);
  isLoading = signal(false);

  // Filter State
  zones = signal<DormZone[]>([]);
  searchQuery = signal<string>('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  selectedZone = signal<string | null>(null);

  // Default Center (MSU Khamrieng)
  readonly DEFAULT_LAT = 16.2458428;
  readonly DEFAULT_LNG = 103.2500078;
  readonly FILTER_RADIUS_KM = 1;

  private routerSub: Subscription;

  constructor(
    private dormService: DormServices,
    private router: Router,
    private zone: NgZone,
    private renderer: Renderer2,
    public mainLayout: MainLayoutPage
  ) {
    addIcons({ star, locationOutline, timeOutline, closeOutline, bookmarkOutline });

    // Automatically update map markers when dorms data changes from API
    effect(() => {
      const dormsToDisplay = this.dorms();
      this.updateMapMarkers(dormsToDisplay);
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

  forceReload() {
    // Reset state
    this.sheetOpen.set(false);
    this.selectedDorm.set(null);
    
    // Clean up existing map if any
    if (this.newMap) {
      this.newMap.destroy().catch(e => console.error('Failed to destroy map:', e));
      // @ts-ignore
      this.newMap = null;
      this.currentMarkerIds = [];
      this.currentCircleIds = [];
    }

    this.loadDorms();
    this.loadZones();
  }

  cleanupMapAndView() {
    this.renderer.removeClass(document.body, 'map-view-active');
    
    if (this.newMap) {
      this.newMap.destroy().catch(e => console.error('Failed to destroy map on leave:', e));
      // @ts-ignore
      this.newMap = null;
      this.currentMarkerIds = [];
      this.currentCircleIds = [];
    }
  }

  async loadDorms() {
    this.isLoading.set(true);

    const params: DormQueryParams = {};

    if (this.searchQuery()) params.search = this.searchQuery();
    if (this.minPrice() !== null) params.minPrice = this.minPrice();
    if (this.maxPrice() !== null) params.maxPrice = this.maxPrice();
    
    // Convert zone ID to zone name if needed, and update lat/lng to zone center
    const selectedZoneId = this.selectedZone();
    if (selectedZoneId) {
       const zoneObj = this.zones().find(z => z.ZONE_ID.toString() === selectedZoneId);
       if (zoneObj) {
         params.zone = zoneObj.ZONE_NAME;
         params.lat = zoneObj.lat || this.DEFAULT_LAT;
         params.lng = zoneObj.lng || this.DEFAULT_LNG;
         params.radius = this.FILTER_RADIUS_KM;
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
            // Update the signal inside NgZone to trigger change detection
            this.zone.run(() => {
              this.dorms.set(res.data);
            });
            // Give the DOM a moment to render the map element before init
            setTimeout(async () => {
              await this.initMap();
              // Explicitly draw markers and circles after map is ready
              await this.updateMapMarkers(this.dorms());
              
              if (selectedZoneId && params.lat && params.lng) {
                 await this.updateMapCircle(params.lat, params.lng, this.FILTER_RADIUS_KM);
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
    // Update signals based on emitted params from FilterGroupComponent
    this.searchQuery.set(params.search || '');
    this.minPrice.set(params.minPrice !== undefined ? params.minPrice : null);
    this.maxPrice.set(params.maxPrice !== undefined ? params.maxPrice : null);
    this.selectedZone.set(params.zone || null);
    
    // Close the detail sheet if open
    this.sheetOpen.set(false);

    // Fetch new filtered data from API
    this.loadDorms();
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
    // Only run mapping on native platforms for performance
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
          apiKey: this.dormService.endPoint, // Fallback placeholder if missing env var
          config: {
            center: {
              lat: this.DEFAULT_LAT,
              lng: this.DEFAULT_LNG,
            },
            zoom: 14,
            disableDefaultUI: true,
          },
        });
        
        // Apply transparency to allow native map to show through
        this.renderer.addClass(document.body, 'map-view-active');
        await this.newMap.enableCurrentLocation(true).catch(e => console.error(e));

        // Close bottom sheet if map is clicked (outside a marker)
        await this.newMap.setOnMapClickListener(() => {
          this.zone.run(() => {
              this.sheetOpen.set(false);
          });
        });
      }

    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  async updateMapCircle(lat: number, lng: number, radiusKm: number) {
    if (!this.newMap) return;
    try {
      await this.clearMapCircle();
      
      this.currentCircleIds = await this.newMap.addCircles([{
        center: { lat, lng },
        radius: radiusKm * 1000,
        fillColor: '#FFCC00', // Yellow
        fillOpacity: 0.25,     // 25% opacity for glass effect
        strokeColor: '#FFCC00',
        strokeWeight: 2,
      }]);

      await this.newMap.setCamera({
        coordinate: { lat, lng },
        zoom: 14.5, // zoomed in slightly more to fit the 1km radius nicely
        animate: true
      });
    } catch (error) {
      console.error('Error drawing circle:', error);
    }
  }

  async clearMapCircle() {
    if (!this.newMap) return;
    try {
      if (this.currentCircleIds.length > 0) {
        await this.newMap.removeCircles(this.currentCircleIds);
        this.currentCircleIds = [];
      }
    } catch (error) {
      console.error('Error removing circle:', error);
    }
  }

  async updateMapMarkers(dormsToDisplay: DormSummary[]) {
    if (!this.newMap) return;

    try {
      // Remove old markers before adding new ones
      if (this.currentMarkerIds.length > 0) {
        await this.newMap.removeMarkers(this.currentMarkerIds);
        this.currentMarkerIds = []; // Clear array
      }

      const markersData = dormsToDisplay.map((dorm) => ({
        coordinate: {
          lat: dorm.lat,
          lng: dorm.lng,
        }
        // Removed title: " " to try and suppress the native bubble/msg box.
        // If the marker becomes unclickable, we will try another approach.
      }));

      if (markersData.length > 0) {
        this.currentMarkerIds = await this.newMap.addMarkers(markersData);

        // Listen for marker clicks
        await this.newMap.setOnMarkerClickListener(async (marker) => {
          this.zone.run(() => {
            // Find the dorm corresponding to the clicked marker index
            const index = this.currentMarkerIds.indexOf(marker.markerId);
            if (index !== -1 && index < dormsToDisplay.length) {
               const selected = dormsToDisplay[index];
               this.selectedDorm.set(selected);
               this.sheetOpen.set(true);
               
               // Optionally pan to the marker
               this.newMap.setCamera({
                 coordinate: { lat: selected.lat, lng: selected.lng },
                 animate: true
               });
            }
          });
        });
      }
    } catch (error) {
       console.error('Error updating map markers:', error);
    }
  }

  ngOnDestroy() {
    this.cleanupMapAndView();
    if(this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }
}
