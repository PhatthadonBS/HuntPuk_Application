import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonButton,
  IonModal,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonAvatar,
  IonSpinner
} from '@ionic/angular/standalone';
import { DormServices } from 'src/app/services/dormServices';
import { AuthenService } from 'src/app/services/authenService';
import { DormSummary, DormDetail } from 'src/app/model/dorm.model';
import { environment } from 'src/environments/environment';
import { addIcons } from 'ionicons';
import { addCircleOutline, closeCircleOutline, arrowBackCircleOutline, searchOutline, closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-dorm-compare',
  templateUrl: './dorm-compare.page.html',
  styleUrls: ['./dorm-compare.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonButton,
    IonModal,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonAvatar,
    IonSpinner
  ]
})
export class DormComparePage implements OnInit {
  env = environment;
  
  maxDorms = signal<number>(2);
  selectedDorms = signal<DormDetail[]>([]);
  
  // Selection Modal state
  isModalOpen = signal<boolean>(false);
  allDorms = signal<DormSummary[]>([]);
  searchQuery = signal<string>('');
  isLoadingModal = signal<boolean>(false);
  isLoadingDetail = signal<boolean>(false);

  filteredDorms = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const currentSelectedIds = this.selectedDorms().map(d => d.DORM_ID);
    
    return this.allDorms().filter(d => 
      !currentSelectedIds.includes(d.DORM_ID) && 
      d.DORM_NAME.toLowerCase().includes(query)
    );
  });

  constructor(
    private dormSv: DormServices,
    private authSv: AuthenService
  ) {
    addIcons({ addCircleOutline, closeCircleOutline, arrowBackCircleOutline, searchOutline, closeOutline });
  }

  ngOnInit() {
    // Set max based on login status
    const isLoggedIn = !!this.authSv.currentUserValue;
    this.maxDorms.set(isLoggedIn ? 5 : 2);
    this.loadAllDorms();
  }

  loadAllDorms() {
    this.isLoadingModal.set(true);
    this.dormSv.getDorms().subscribe({
      next: (res) => {
        if (res.success) {
          this.allDorms.set(res.data);
        }
        this.isLoadingModal.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoadingModal.set(false);
      }
    });
  }

  openSelectModal() {
    if (this.selectedDorms().length >= this.maxDorms()) return;
    this.searchQuery.set('');
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  selectDorm(dormId: number) {
    this.closeModal();
    this.isLoadingDetail.set(true);
    
    this.dormSv.getDormById(dormId).subscribe({
      next: (res) => {
        if (res.success) {
          this.selectedDorms.update(dorms => [...dorms, res.data]);
        }
        this.isLoadingDetail.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoadingDetail.set(false);
      }
    });
  }

  removeDorm(index: number) {
    this.selectedDorms.update(dorms => {
      const newDorms = [...dorms];
      newDorms.splice(index, 1);
      return newDorms;
    });
  }
}
