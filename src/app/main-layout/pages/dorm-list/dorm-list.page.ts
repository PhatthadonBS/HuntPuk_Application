import { Component, OnInit, signal, computed } from '@angular/core';
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
  IonBackButton
} from '@ionic/angular/standalone';
import { DormServices } from 'src/app/services/dormServices';
import { DormSummary, DormZone } from 'src/app/model/dorm.model';
import { addIcons } from 'ionicons';
import { filterOutline, star, locationOutline, cashOutline, arrowBackCircleOutline, searchOutline } from 'ionicons/icons';
import { environment } from 'src/environments/environment';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';

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
    IonBackButton
  ],
})
export class DormListPage implements OnInit {
  allDorms = signal<DormSummary[]>([]);
  zones = signal<DormZone[]>([]);
  
  searchQuery = signal<string>('');
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  selectedZone = signal<string | null>(null); // Use string because zone name is returned in summary

  isFilterModalOpen = false;
  env = environment;

  filteredDorms = computed(() => {
    let dorms = this.allDorms();
    const query = this.searchQuery().toLowerCase();
    const min = this.minPrice();
    const max = this.maxPrice();
    const zone = this.selectedZone();

    if (query) {
      dorms = dorms.filter((d) => d.DORM_NAME.toLowerCase().includes(query));
    }
    if (min !== null) {
      dorms = dorms.filter((d) => d.start_price >= min);
    }
    if (max !== null) {
      dorms = dorms.filter((d) => d.start_price <= max);
    }
    if (zone) {
      dorms = dorms.filter((d) => d.zone === zone);
    }

    return dorms;
  });

  constructor(
    private dormSv: DormServices, 
    private route: ActivatedRoute,
    private navCtrl: NavController
  ) {
    addIcons({ filterOutline, star, locationOutline, cashOutline, arrowBackCircleOutline, searchOutline });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchQuery.set(params['q']);
      }
      if (params['openFilter'] === 'true') {
        this.isFilterModalOpen = true;
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

  openFilterModal() {
    this.isFilterModalOpen = true;
  }

  closeFilterModal() {
    this.isFilterModalOpen = false;
  }

  clearFilters() {
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.selectedZone.set(null);
  }

  goBack() {
    this.navCtrl.back();
  }
}
