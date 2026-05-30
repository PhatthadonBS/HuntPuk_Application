import { Component, OnInit, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  IonBackButton,
  IonFab,
  IonFabButton
} from '@ionic/angular/standalone';
import { DormServices } from 'src/app/services/dormServices';
import { DormSummary, DormZone } from 'src/app/model/dorm.model';
import { addIcons } from 'ionicons';
import { 
  filterOutline, 
  star, 
  locationOutline, 
  cashOutline, 
  arrowBackCircleOutline, 
  searchOutline, 
  timeOutline, 
  chevronForwardOutline,
  bookmarkOutline,
  bookmark,
  bedOutline,
  arrowUpOutline
} from 'ionicons/icons';
import { environment } from 'src/environments/environment';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { FilterGroupComponent, FilterParams } from '../../components/filter-group/filter-group.component';
import { MainLayoutPage } from '../../main-layout.page';

@Component({
  selector: 'app-dorm-list',
  templateUrl: './dorm-list.page.html',
  styleUrls: ['./dorm-list.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonSearchbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonModal,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonImg,
    IonGrid,
    IonRow,
    IonCol,
    IonList,
    IonBackButton,
    IonFab,
    IonFabButton,
    FilterGroupComponent
  ],
})
export class DormListPage implements OnInit {
  @ViewChild(IonContent, { static: false }) content?: IonContent;

  allDorms = signal<DormSummary[]>([]);
  zones = signal<DormZone[]>([]);
  
  searchQuery = signal<string>('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  selectedZoneId = signal<string | null>(null); // Store Zone ID as string
  initialParams = signal<FilterParams | null>(null);
  autoOpenFilter = signal<boolean>(false);
  showScrollBtn = signal<boolean>(false);

  env = environment;

  filteredDorms = computed(() => {
    let dorms = this.allDorms();
    const query = this.searchQuery().toLowerCase();
    const min = this.minPrice();
    const max = this.maxPrice();
    const zoneId = this.selectedZoneId();

    if (query) {
      dorms = dorms.filter((d) => d.DORM_NAME.toLowerCase().includes(query));
    }
    if (min !== null) {
      dorms = dorms.filter((d) => d.start_price >= min);
    }
    if (max !== null) {
      dorms = dorms.filter((d) => d.start_price <= max);
    }
    if (zoneId) {
      const zoneObj = this.zones().find(z => z.ZONE_ID.toString() === zoneId);
      if (zoneObj) {
        dorms = dorms.filter((d) => d.zone === zoneObj.ZONE_NAME);
      }
    }

    return dorms;
  });

  constructor(
    private dormSv: DormServices, 
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private mainLayout: MainLayoutPage
  ) {
    addIcons({ 
      filterOutline, 
      star, 
      locationOutline, 
      cashOutline, 
      arrowBackCircleOutline, 
      searchOutline,
      timeOutline,
      chevronForwardOutline,
      bookmarkOutline,
      bookmark,
      bedOutline,
      arrowUpOutline
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const p: FilterParams = {};
      if (params['q']) {
        p.search = params['q'];
        this.searchQuery.set(params['q']);
      }
      if (params['zone']) {
        p.zone = params['zone'];
        this.selectedZoneId.set(params['zone']);
      }
      
      if (Object.keys(p).length > 0) {
        this.initialParams.set(p);
      }

      if (params['openFilter'] === 'true') {
        this.autoOpenFilter.set(true);
      }
    });

    this.loadDorms();
    this.loadZones();
  }

  loadDorms() {
    this.dormSv.getDorms().subscribe({
      next: (res) => {
        if (res.success) {
          this.allDorms.set(res.data);
        }
      },
      error: (err) => console.error('Error fetching dorms', err),
    });
  }

  loadZones() {
    this.dormSv.getZones().subscribe({
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
    this.minPrice.set(params.minPrice ?? null);
    this.maxPrice.set(params.maxPrice ?? null);
    this.selectedZoneId.set(params.zone || null);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.selectedZoneId.set(null);
  }

  goToDormDetail(id: number) {
    this.navCtrl.navigateForward(`/dorm-detail/${id}`);
  }

  toggleFavorite(event: Event, dorm: DormSummary) {
    event.stopPropagation();
    console.log('Toggle favorite for:', dorm.DORM_NAME);
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    this.showScrollBtn.set(scrollTop > 400);
  }

  scrollToTop() {
    this.content?.scrollToTop(500);
  }

  onSearchFocus() {
    this.mainLayout.hideFooter.set(true);
  }

  onSearchBlur() {
    this.mainLayout.hideFooter.set(false);
  }

  goBack() {
    this.navCtrl.back();
  }
}
