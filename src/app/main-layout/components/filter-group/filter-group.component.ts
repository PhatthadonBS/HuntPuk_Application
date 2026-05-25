import { Component, OnInit, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { searchOutline, filterOutline, gitCompareOutline, closeOutline, arrowBackOutline } from 'ionicons/icons';
import { 
  IonSearchbar, IonButton, IonIcon, IonModal 
} from '@ionic/angular/standalone';
import { DormZone } from 'src/app/model/dorm.model';
import { NavController } from '@ionic/angular';

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
    CommonModule, FormsModule, IonSearchbar, IonButton, IonIcon, IonModal
  ]
})
export class FilterGroupComponent implements OnInit, OnChanges {
  @Input() zones: DormZone[] = [];
  @Input() showCompare: boolean = true; 
  @Input() showBack: boolean = false; 
  @Input() showSearch: boolean = true; // New: Option to hide search bar
  @Input() isInline: boolean = false; // New: Option for no bg/shadow
  @Input() initialParams: FilterParams | null = null;
  @Input() openFilterOnLoad: boolean = false; 
  @Output() filterApplied = new EventEmitter<FilterParams>();

  searchQuery: string = '';

  // สถานะการเปิด-ปิด Div 90%
  isFilterModalOpen: boolean = false;

  // ตัวแปรเก็บค่าตัวกรอง
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedZone: string = '';

  constructor(private router: Router, private navCtrl: NavController) {
    addIcons({ searchOutline, filterOutline, gitCompareOutline, closeOutline, arrowBackOutline });
  }

  ngOnInit() {
    if (this.initialParams) {
      this.syncParams(this.initialParams);
    }

    if (this.openFilterOnLoad) {
      this.isFilterModalOpen = true;
    }
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

  onSearch() {
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
}
