import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonImg,
  IonCheckbox,
  IonButton,
  IonIcon,
  IonBadge,
  IonFooter,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSpinner,
  ToastController,
  NavController,
} from '@ionic/angular/standalone';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { UserFavGetRes } from 'src/app/model/user.model';
import { Subscription } from 'rxjs';
import { addIcons } from 'ionicons';
import { 
  trashOutline, 
  gitCompareOutline, 
  star, 
  locationOutline,
  bookmarkOutline,
  closeOutline,
  homeOutline
} from 'ionicons/icons';
import { environment } from 'src/environments/environment';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';

@Component({
  selector: 'app-my-favorites',
  templateUrl: './my-favorites.page.html',
  styleUrls: ['./my-favorites.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonThumbnail,
    IonImg,
    IonCheckbox,
    IonButton,
    IonIcon,
    IonBadge,
    IonFooter,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonSpinner,
    CommonModule,
    FormsModule,
    LoadingUIComponent
  ],
})
export class MyFavoritesPage implements OnInit, OnDestroy {
  env = environment;
  favorites = signal<UserFavGetRes[]>([]);
  selectedDormIds = signal<number[]>([]);
  isLoading = signal<boolean>(true);
  
  private userSub?: Subscription;
  currentUser: any = null;

  constructor(
    private userSv: UserServices,
    private authSv: AuthenService,
    private toastCtrl: ToastController,
    private navCtrl: NavController
  ) {
    addIcons({
      trashOutline,
      gitCompareOutline,
      star,
      locationOutline,
      bookmarkOutline,
      closeOutline,
      homeOutline
    });
  }

  ngOnInit() {
    this.userSub = this.authSv.user$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadFavorites();
      } else {
        this.navCtrl.navigateRoot('/login');
      }
    });
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  loadFavorites() {
    if (!this.currentUser) return;
    this.isLoading.set(true);
    this.userSv.getMyFavorites(this.currentUser.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.favorites.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching favorites', err);
        this.isLoading.set(false);
      },
    });
  }

  toggleSelection(dormId: number, event: any) {
    const isChecked = event.detail.checked;
    this.selectedDormIds.update((ids) => {
      if (isChecked) {
        if (ids.length >= 5) {
          this.showToast('เปรียบเทียบได้สูงสุด 5 แห่ง', 'warning');
          setTimeout(() => event.target.checked = false, 0);
          return ids;
        }
        return [...ids, dormId];
      } else {
        return ids.filter((id) => id !== dormId);
      }
    });
  }

  async removeFavorite(dormId: number) {
    this.userSv.removeFavorite(dormId).subscribe({
      next: async (res) => {
        this.favorites.update((favs) => favs.filter((f) => f.DORMID !== dormId));
        this.selectedDormIds.update((ids) => ids.filter((id) => id !== dormId));
        this.showToast('ลบออกจากรายการโปรดแล้ว', 'success');
      },
      error: (err) => {
        console.error('Error removing favorite', err);
        this.showToast('ไม่สามารถลบได้ กรุณาลองใหม่', 'danger');
      },
    });
  }

  confirmComparison() {
    const ids = this.selectedDormIds();
    if (ids.length < 2) {
      this.showToast('กรุณาเลือกหอพักอย่างน้อย 2 แห่งเพื่อเปรียบเทียบ', 'primary');
      return;
    }
    // Navigate to comparison page and pass IDs
    // We can use state or query params. Let's use navigation state or service.
    // For now, let's assume DormComparePage can read these from somewhere.
    // I will implement passing them via state.
    this.navCtrl.navigateForward('/dorm-compare', {
      state: { preSelectedIds: ids }
    });
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

  goToDetail(dormId: number) {
    this.navCtrl.navigateForward(`/dorm-detail/${dormId}`);
  }
}

