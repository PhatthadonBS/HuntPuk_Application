import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  Signal,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  gitCompareOutline,
  closeOutline,
  arrowBackOutline,
  locationOutline,
  swapHorizontalOutline,
  funnelOutline,
} from 'ionicons/icons';
import {
  IonSearchbar,
  IonButton,
  IonIcon,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonImg,
} from '@ionic/angular/standalone';
import { DormSummary, DormZone, FilterParams } from 'src/app/model/dorm.model';
import { NavController } from '@ionic/angular';
import {
  Subject,
  debounceTime,
  takeUntil,
  distinctUntilChanged,
  switchMap,
  of,
} from 'rxjs';
import { DormServices } from 'src/app/services/dormServices';
import { AuthenService } from 'src/app/services/authenService';

@Component({
  selector: 'app-filter-group',
  templateUrl: './filter-group.component.html',
  styleUrls: ['./filter-group.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonSearchbar,
    IonButton,
    IonIcon,
    IonModal,
    IonList,
    IonItem,
    IonLabel,
    IonImg,
  ],
})
export class FilterGroupComponent implements OnInit, OnChanges, OnDestroy {
  @Input() zones: DormZone[] = [];
  @Input() showCompare: boolean = true;
  @Input() showFilter: boolean = true;
  @Input() showSearch: boolean = true;
  @Input() showAutoComplete: boolean = true;
  @Input() initialParams: FilterParams | null = null;
  @Input() openFilterOnLoad: boolean = false;
  @Input() showSortByPrice: boolean = true;
  @Input() showSortByName: boolean = true;
  @Output() filterApplied = new EventEmitter<FilterParams>();
  @Output() searchFocus = new EventEmitter<void>();
  @Output() searchBlur = new EventEmitter<void>();

  searchQuery: string = '';
  suggestions: DormSummary[] = [];
  showSuggestions: boolean = false;

  // สถานะการเปิด-ปิด Div 90%
  isFilterModalOpen: boolean = false;

  // ตัวแปรเก็บค่าตัวกรอง
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedZone: string = '';
  selectedScore: number | null = null;
  maxWater: number | null = null;
  maxElect: number | null = null;
  sortByPrice: string = 'acs';
  sortByName: string = 'asc';

  private pressTimeout: any;
  activeTooltip: string = '';

  role = signal<number | null>(null);

  private searchSubject = new Subject<void>();
  private autocompleteSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private navCtrl: NavController,
    private dormService: DormServices,
    private authSv: AuthenService
  ) {
    addIcons({
      searchOutline,
      funnelOutline,
      gitCompareOutline,
      closeOutline,
      arrowBackOutline,
      locationOutline,
      swapHorizontalOutline,
    });
  }

  ngOnInit() {
    // Read from initial params on init
    this.syncFromInitialParams();
    this.role.set(this.authSv.currentUserValue?.role || null);

    if (this.openFilterOnLoad) {
      this.isFilterModalOpen = true;
    }

    // Main Search Debounce (2 seconds as requested)
    this.searchSubject
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => {
        this.emitFilters();
      });

    // Autocomplete Debounce (300ms for fast UI feedback)
    this.autocompleteSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (!trimmed) return of({ success: true, data: [] });
          return this.dormService.getDormsMobile({ search: trimmed });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        if (res.success) {
          this.suggestions = res.data;
        }
      });
  }

  private parseNumber(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialParams'] && this.initialParams) {
      if (this.searchQuery !== (this.initialParams.search || '')) {
        this.searchQuery = this.initialParams.search || '';
      }

      if (!this.isFilterModalOpen) {
        this.minPrice = this.parseNumber(this.initialParams.minPrice);
        this.maxPrice = this.parseNumber(this.initialParams.maxPrice);
        this.selectedZone = this.initialParams.zone
          ? this.initialParams.zone.toString()
          : '';
        this.selectedScore = this.parseNumber(this.initialParams.score);
        this.maxWater = this.parseNumber(this.initialParams.maxWater);
        this.maxElect = this.parseNumber(this.initialParams.maxElect);
        this.sortByPrice = this.initialParams.sortByPrice || '';
        this.sortByName = this.initialParams.sortByName || '';
      }
    }
  }

  private syncFromInitialParams() {
    if (this.initialParams) {
      this.searchQuery = this.initialParams.search || '';
      this.minPrice = this.parseNumber(this.initialParams.minPrice);
      this.maxPrice = this.parseNumber(this.initialParams.maxPrice);
      this.selectedZone = this.initialParams.zone
        ? this.initialParams.zone.toString()
        : '';
      this.selectedScore = this.parseNumber(this.initialParams.score);
      this.maxWater = this.parseNumber(this.initialParams.maxWater);
      this.maxElect = this.parseNumber(this.initialParams.maxElect);
      this.sortByPrice = this.initialParams.sortByPrice || '';
      this.sortByName = this.initialParams.sortByName || '';
    } else {
      this.searchQuery = '';
      this.minPrice = null;
      this.maxPrice = null;
      this.selectedZone = '';
      this.selectedScore = null;
      this.maxWater = null;
      this.maxElect = null;
      this.sortByPrice = '';
      this.sortByName = '';
    }
  }

  private syncParams(params: FilterParams) {
    this.searchQuery = params.search || '';
    this.minPrice = this.parseNumber(params.minPrice);
    this.maxPrice = this.parseNumber(params.maxPrice);
    this.selectedScore = this.parseNumber(params.score);
    this.maxWater = this.parseNumber(params.maxWater);
    this.maxElect = this.parseNumber(params.maxElect);
    this.sortByPrice = params.sortByPrice || '';
    this.sortByName = params.sortByName || '';

    if (params.zone) {
      this.selectedZone = params.zone.toString();
    } else {
      this.selectedZone = '';
    }
  }

  onInput() {
    this.showSuggestions = true;
    this.autocompleteSubject.next(this.searchQuery);
    this.searchSubject.next(); // Also trigger main search after delay
  }

  onClear() {
    this.searchQuery = '';
    this.suggestions = [];
    this.showSuggestions = false;
    this.emitFilters(); // Immediate response when cleared
  }

  onEnter() {
    this.showSuggestions = false;
    this.emitFilters();
  }

  onBlur() {
    this.searchBlur.emit();
    // Small delay to allow clicking a suggestion
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  onFocus() {
    this.showSuggestions = true;
    this.searchFocus.emit();
  }

  selectSuggestion(name: string) {
    this.searchQuery = name;
    this.suggestions = [];
    this.showSuggestions = false;
    this.emitFilters();
  }

  forceSearch() {
    this.showSuggestions = false;
    this.emitFilters();
  }

  goToFilter() {
    // Sync UI with the latest state (which is now just resetting to empty) before opening modal
    this.syncFromInitialParams();
    this.isFilterModalOpen = true;
  }

  goToCompare() {
    this.router.navigate(['/dorm-compare']);
  }

  goBack() {
    this.navCtrl.back();
  }

  applyFilters() {
    this.emitFilters();
    this.isFilterModalOpen = false;
  }

  private emitFilters() {
    const params: FilterParams = {};
    if (this.searchQuery && this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }

    if (this.minPrice !== null && this.minPrice !== undefined) {
      params.minPrice = this.minPrice;
    }

    if (this.maxPrice !== null && this.maxPrice !== undefined) {
      params.maxPrice = this.maxPrice;
    }

    if (this.selectedZone) {
      params.zone = this.selectedZone;
    }

    if (this.selectedScore !== null && this.selectedScore !== undefined) {
      params.score = this.selectedScore;
    }

    if (this.maxWater !== null && this.maxWater !== undefined) {
      params.maxWater = this.maxWater;
    }

    if (this.maxElect !== null && this.maxElect !== undefined) {
      params.maxElect = this.maxElect;
    }

    if (this.sortByPrice) {
      params.sortByPrice = this.sortByPrice;
    }

    if (this.sortByName) {
      params.sortByName = this.sortByName;
    }

    this.filterApplied.emit(params);
  }

  clearFilters() {
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedZone = '';
    this.selectedScore = null;
    this.searchQuery = '';
    this.maxWater = null;
    this.maxElect = null;
    this.sortByPrice = '';
    this.sortByName = '';

    // Do not close the modal, allow the user to see the fields reset to their default values.
    // They can then close the modal using the close button or by applying filters.

    setTimeout(() => {
      this.emitFilters();
    }, 0);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSortByName() {
    this.sortByName = this.sortByName === 'asc' ? 'desc' : 'asc';
    this.emitFilters();
  }

  startPress(tooltipId: string) {
    this.pressTimeout = setTimeout(() => {
      this.activeTooltip = tooltipId;
    }, 500); // 500ms for long press
  }

  endPress() {
    if (this.pressTimeout) {
      clearTimeout(this.pressTimeout);
      this.pressTimeout = null;
    }
    this.activeTooltip = '';
  }
}
