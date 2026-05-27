import { Component, OnInit, Output, EventEmitter, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { searchOutline, filterOutline, gitCompareOutline, closeOutline, arrowBackOutline, locationOutline } from 'ionicons/icons';
import { 
  IonSearchbar, IonButton, IonIcon, IonModal, IonList, IonItem, IonLabel 
} from '@ionic/angular/standalone';
import { DormSummary, DormZone } from 'src/app/model/dorm.model';
import { NavController } from '@ionic/angular';
import { Subject, debounceTime, takeUntil, distinctUntilChanged, switchMap, of } from 'rxjs';
import { DormServices } from 'src/app/services/dormServices';

export interface FilterParams {
  search?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  zone?: string;
}

@Component({
  selector: 'app-filter-group',
  templateUrl: './filter-group.component.html',
  styleUrls: ['./filter-group.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonSearchbar, IonButton, IonIcon, IonModal, IonList, IonItem, IonLabel
  ]
})
export class FilterGroupComponent implements OnInit, OnChanges, OnDestroy {
  @Input() zones: DormZone[] = [];
  @Input() showCompare: boolean = true; 
  @Input() showBack: boolean = false; 
  @Input() showSearch: boolean = true; 
  @Input() isInline: boolean = false; 
  @Input() initialParams: FilterParams | null = null;
  @Input() openFilterOnLoad: boolean = false; 
  @Output() filterApplied = new EventEmitter<FilterParams>();

  searchQuery: string = '';
  suggestions: DormSummary[] = [];
  showSuggestions: boolean = false;

  // สถานะการเปิด-ปิด Div 90%
  isFilterModalOpen: boolean = false;

  // ตัวแปรเก็บค่าตัวกรอง
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedZone: string = '';

  private searchSubject = new Subject<void>();
  private autocompleteSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router, 
    private navCtrl: NavController,
    private dormService: DormServices
  ) {
    addIcons({ searchOutline, filterOutline, gitCompareOutline, closeOutline, arrowBackOutline, locationOutline });
  }

  ngOnInit() {
    if (this.initialParams) {
      this.syncParams(this.initialParams);
    }

    if (this.openFilterOnLoad) {
      this.isFilterModalOpen = true;
    }

    // Main Search Debounce (2 seconds as requested)
    this.searchSubject.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.emitFilters();
    });

    // Autocomplete Debounce (300ms for fast UI feedback)
    this.autocompleteSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        const trimmed = query.trim();
        if (!trimmed) return of({ success: true, data: [] });
        return this.dormService.getDorms({ search: trimmed });
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      if (res.success) {
        this.suggestions = res.data;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialParams'] && this.initialParams) {
      this.syncParams(this.initialParams);
    }
  }

  private syncParams(params: FilterParams) {
    this.searchQuery = params.search || '';
    this.minPrice = params.minPrice ?? null;
    this.maxPrice = params.maxPrice ?? null;
    this.selectedZone = params.zone || '';
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
    // Small delay to allow clicking a suggestion
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
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
    this.isFilterModalOpen = true; 
  }

  goToCompare() {
    this.router.navigate(['/dorm-compare']);
  }

  goBack() {
    this.navCtrl.back();
  }

  applyFilters() {
    this.isFilterModalOpen = false; 
    this.emitFilters();
  }

  private emitFilters() {
    const params: FilterParams = {};
    if (this.searchQuery.trim()) params.search = this.searchQuery;
    if (this.minPrice) params.minPrice = this.minPrice;
    if (this.maxPrice) params.maxPrice = this.maxPrice;
    if (this.selectedZone) params.zone = this.selectedZone;

    this.filterApplied.emit(params);
  }

  clearFilters() {
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedZone = '';
    this.searchQuery = '';
    this.isFilterModalOpen = false; 
    this.emitFilters();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
