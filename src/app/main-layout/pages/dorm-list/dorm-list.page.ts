import {
  Component,
  OnInit,
  signal,
  computed,
  ViewChild,
  OnDestroy,
} from '@angular/core';
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
  IonFabButton,
  ToastController,
  IonRefresher,
  IonRefresherContent,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { DormServices } from 'src/app/services/dormServices';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { DormSummary, DormZone, FilterParams } from 'src/app/model/dorm.model';
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
  arrowUpOutline,
  navigateOutline,
} from 'ionicons/icons';
import { environment } from 'src/environments/environment';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { FilterGroupComponent } from '../../components/filter-group/filter-group.component';
import { MainLayoutPage } from '../../main-layout.page';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { finalize, Subscription, forkJoin, of } from 'rxjs';

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
    FilterGroupComponent,
    LoadingUIComponent,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class DormListPage implements OnInit, OnDestroy, ViewWillEnter {
  @ViewChild(IonContent, { static: false }) content?: IonContent;

  allDorms = signal<DormSummary[]>([]);
  zones = signal<DormZone[]>([]);
  isLoading = signal<boolean>(false);

  searchQuery = signal<string>('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  selectedScore = signal<number | null>(null);
  selectedZoneId = signal<string | null>(null); // Store Zone ID as string
  maxWater = signal<number | null>(null);
  maxElect = signal<number | null>(null);
  sortByPrice = signal<string>('');
  sortByName = signal<string>('');
  initialParams = signal<FilterParams | null>(null);
  autoOpenFilter = signal<boolean>(false);
  showScrollBtn = signal<boolean>(false);

  env = environment;
  private userSub?: Subscription;
  currentUser: any = null;
  favIds = this.userSv.favIds;

  filteredDorms = computed(() => {
    let dorms = this.allDorms();
    const query = this.searchQuery().toLowerCase();
    const min = this.minPrice();
    const max = this.maxPrice();
    const zoneId = this.selectedZoneId();
    const score = this.selectedScore();
    const favs = this.favIds();
    const maxW = this.maxWater();
    const maxE = this.maxElect();
    const sort = this.sortByPrice();
    const sortName = this.sortByName();

    dorms = dorms.map((d) => ({
      ...d,
      isFavorite: favs.includes(d.DORM_ID),
    }));

    if (query) {
      dorms = dorms.filter((d) => d.DORM_NAME.toLowerCase().includes(query));
    }
    if (min !== null) {
      dorms = dorms.filter((d) => d.start_price >= min);
    }
    if (max !== null) {
      dorms = dorms.filter((d) => d.start_price <= max);
    }
    if (score !== null) {
      dorms = dorms.filter((d) => Number(d.SCORE) >= score);
    }
    if (zoneId) {
      const targetZoneId = Number(zoneId);
      const zoneObj = this.zones().find((z) => z.ZONE_ID === targetZoneId);
      if (zoneObj) {
        const targetZoneName = zoneObj.ZONE_NAME?.trim();
        dorms = dorms.filter((d) => {
          if (d.ZONE_ID !== undefined) {
            return d.ZONE_ID === targetZoneId;
          }
          const dZone = (d.zone || d.ZONE_NAME)?.trim();
          return dZone === targetZoneName;
        });
      }
    }

    if (maxW !== null) {
      dorms = dorms.filter((d: any) => {
        const wUnit = d.WATER_UNIT !== undefined && d.WATER_UNIT !== null ? Number(d.WATER_UNIT) : null;
        const wLump = d.WATER_LUMP !== undefined && d.WATER_LUMP !== null ? Number(d.WATER_LUMP) : null;
        return (wUnit !== null && wUnit <= maxW) || (wLump !== null && wLump <= maxW);
      });
    }

    if (maxE !== null) {
      dorms = dorms.filter((d: any) => {
        const eUnit = d.ELECT_UNIT !== undefined && d.ELECT_UNIT !== null ? Number(d.ELECT_UNIT) : null;
        return eUnit !== null && eUnit <= maxE;
      });
    }

    if (sortName === 'asc') {
      dorms.sort((a, b) => a.DORM_NAME.localeCompare(b.DORM_NAME, 'th'));
    } else if (sortName === 'desc') {
      dorms.sort((a, b) => b.DORM_NAME.localeCompare(a.DORM_NAME, 'th'));
    }

    if (sort === 'asc') {
      dorms.sort((a, b) => {
        if (a.start_price === 0 && b.start_price !== 0) return 1;
        if (b.start_price === 0 && a.start_price !== 0) return -1;
        return a.start_price - b.start_price;
      });
    } else if (sort === 'desc') {
      dorms.sort((a, b) => b.start_price - a.start_price);
    }

    return dorms;
  });

  constructor(
    private dormSv: DormServices,
    private userSv: UserServices,
    private authSv: AuthenService,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private mainLayout: MainLayoutPage,
    private toastCtrl: ToastController
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
      arrowUpOutline,
      navigateOutline,
    });
  }

  ionViewWillEnter() {
    if (this.currentUser) {
      this.loadFavIds();
    }
  }

  ngOnInit() {
    this.userSub = this.authSv.user$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadFavIds();
      } else {
        this.favIds.set([]);
      }
    });

    this.route.queryParams.subscribe((params) => {
      const p: FilterParams = {};
      if (params['q']) {
        p.search = params['q'];
        this.searchQuery.set(params['q']);
      }
      if (params['zone']) {
        p.zone = params['zone'];
        this.selectedZoneId.set(params['zone']);
      }
      if (params['score']) {
        const scoreNum = Number(params['score']);
        if (!isNaN(scoreNum)) {
          p.score = scoreNum;
          this.selectedScore.set(scoreNum);
        }
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

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  loadFavIds() {
    if (!this.currentUser) return;
    this.userSv.loadFavIds(this.currentUser.id);
  }

  loadDorms() {
    this.isLoading.set(true);
    this.dormSv
      .getDormsMobile()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.allDorms.set(res.data);
          }
        },
        error: (err) => console.error('Error fetching dorms', err),
      });
  }

  handleRefresh(event: any) {
    this.loadDorms();
    this.loadZones();
    setTimeout(() => {
      event.target.complete();
    }, 500);
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
    this.selectedScore.set(params.score ?? null);
    this.selectedZoneId.set(params.zone || null);
    this.maxWater.set(params.maxWater !== undefined ? params.maxWater : null);
    this.maxElect.set(params.maxElect !== undefined ? params.maxElect : null);
    this.sortByPrice.set(params.sortByPrice || '');
    this.sortByName.set(params.sortByName || 'asc');
    this.content?.scrollToTop(300);
    this.initialParams.set({
      search: params.search,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      score: params.score,
      zone: params.zone,
      maxWater: this.maxWater(),
      maxElect: this.maxElect(),
      sortByPrice: this.sortByPrice(),
      sortByName: this.sortByName(),
    });
  }

  clearFilters() {
    this.searchQuery.set('');
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.selectedScore.set(null);
    this.selectedZoneId.set(null);
    this.maxWater.set(null);
    this.maxElect.set(null);
    this.sortByPrice.set('');
    this.sortByName.set('asc');
    this.initialParams.set(null);
  }

  goToDormDetail(id: number) {
    this.navCtrl.navigateForward(`/dorm-detail/${id}`);
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

  trackByDormId(index: number, dorm: DormSummary): number {
    return dorm.DORM_ID;
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

  goBack() {
    this.navCtrl.back();
  }
}
