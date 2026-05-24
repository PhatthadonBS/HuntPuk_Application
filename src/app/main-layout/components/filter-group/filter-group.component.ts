import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { searchOutline, filterOutline, gitCompareOutline, closeOutline } from 'ionicons/icons';
import { 
  IonSearchbar, IonButton, IonIcon 
} from '@ionic/angular/standalone';
import { DormZone } from 'src/app/model/dorm.model';

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
    CommonModule, FormsModule, IonSearchbar, IonButton, IonIcon
  ]
})
export class FilterGroupComponent implements OnInit {
  @Input() zones: DormZone[] = [];
  @Output() filterApplied = new EventEmitter<FilterParams>();

  searchQuery: string = '';

  // สถานะการเปิด-ปิด Div 90%
  isFilterModalOpen: boolean = false;

  // ตัวแปรเก็บค่าตัวกรอง
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedZone: string = '';

  constructor(private router: Router) {
    addIcons({ searchOutline, filterOutline, gitCompareOutline, closeOutline });
  }

  ngOnInit() {}

  onSearch() {
    this.emitFilters();
  }

  goToFilter() {
    this.isFilterModalOpen = true; // เปิด Div เด้งขึ้นมา
  }

  goToCompare() {
    this.router.navigate(['/dorm-compare']);
  }

  applyFilters() {
    this.isFilterModalOpen = false; // ปิด Div
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
    this.emitFilters();
  }
}
