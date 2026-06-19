import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
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
  IonSpinner,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonAvatar,
  IonList,
  IonItem,
  IonLabel,
  IonTextarea,
  ToastController,
  NavController,
} from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { DormServices } from 'src/app/services/dormServices';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { DormDetail, ReviewItem } from 'src/app/model/dorm.model';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import {
  arrowBackCircleOutline,
  bookmarkOutline,
  bookmark,
  locationOutline,
  callOutline,
  waterOutline,
  flashOutline,
  bedOutline,
  star,
  starOutline,
  sendOutline,
  chevronBackOutline,
  chevronForwardOutline,
  cubeOutline,
  informationCircleOutline,
  alertCircleOutline,
  swapHorizontalOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-dorm-detail',
  templateUrl: './dorm-detail.page.html',
  styleUrls: ['./dorm-detail.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonButton,
    IonSpinner,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonAvatar,
    IonList,
    IonItem,
    IonLabel,
    IonTextarea,
    CommonModule,
    FormsModule,
    LoadingUIComponent,
  ],
})
export class DormDetailPage implements OnInit, OnDestroy {
  @ViewChild('galleryContainer', { static: false }) galleryContainer!: ElementRef;

  dormId: number | null = null;
  dorm = signal<DormDetail | null>(null);
  reviews = signal<ReviewItem[]>([]);
  isLoading = signal<boolean>(true);
  isFavorite = signal<boolean>(false);
  hasError = signal<boolean>(false);
  
  isPreview = signal<boolean>(false);
  isAdminReq = signal<boolean>(false);
  
  userSub?: Subscription;
  currentUser: any = null;
  newReviewScore: number = 0;
  newReviewComment: string = '';
  facImageErrors: { [key: number]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private dormSv: DormServices,
    private userSv: UserServices,
    private authSv: AuthenService,
    private toastController: ToastController,
    private navCtrl: NavController
  ) {
    addIcons({
      arrowBackCircleOutline,
      bookmarkOutline,
      bookmark,
      locationOutline,
      callOutline,
      waterOutline,
      flashOutline,
      bedOutline,
      star,
      starOutline,
      sendOutline,
      chevronBackOutline,
      chevronForwardOutline,
      cubeOutline,
      informationCircleOutline,
      alertCircleOutline,
      swapHorizontalOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit() {
    this.userSub = this.authSv.user$.subscribe((user) => {
      this.currentUser = user;
    });

    this.route.queryParams.subscribe(params => {
      this.isPreview.set(params['preview'] === 'true');
      this.isAdminReq.set(params['adminReq'] === 'true');
    });

    const idParam = this.route.snapshot.paramMap.get('dorm_id');
    if (idParam) {
      this.dormId = Number(idParam);
      this.loadAllData();
    } else {
      this.hasError.set(true);
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  loadAllData() {
    if (!this.dormId) return;
    this.isLoading.set(true);
    this.hasError.set(false);

    forkJoin({
      dormDetails: this.dormSv.getDormById(this.dormId).pipe(
        catchError(err => {
          console.error('Error fetching dorm details', err);
          return of(null);
        })
      ),
      dormReviews: this.dormSv.getReviewsByDormId(this.dormId).pipe(
        catchError(err => {
          console.error('Error fetching reviews', err);
          return of(null);
        })
      )
    }).subscribe({
      next: ({ dormDetails, dormReviews }) => {
        if (dormDetails && dormDetails.success) {
          const dData = dormDetails.data;
          // Combine front image with gallery for the album
          if (dData.image) {
            if (!dData.gallery) dData.gallery = [];
            if (!dData.gallery.includes(dData.image)) {
              dData.gallery.unshift(dData.image);
            }
          }
          this.dorm.set(dData);
        } else {
          this.hasError.set(true);
        }

        if (dormReviews && dormReviews.success) {
          this.reviews.set(dormReviews.data);
        }
        
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  toggleFavorite() {
    if (!this.currentUser || !this.dormId) return;
    
    // Optimistic update
    const current = this.isFavorite();
    this.isFavorite.set(!current);
    
    if (current) {
      this.userSv.removeFavorite(this.dormId).subscribe({
        error: () => this.isFavorite.set(true) // revert on error
      });
    } else {
      this.userSv.addFavorite(this.dormId).subscribe({
        error: () => this.isFavorite.set(false) // revert on error
      });
    }
  }

  setRating(score: number) {
    this.newReviewScore = score;
  }

  submitReview() {
    if (!this.currentUser || !this.dormId || this.newReviewScore === 0) return;
    
    // Show partial loading state specifically for review submission if needed
    // For now, just disabling the button via template is enough

    this.dormSv.addReview({
      user_id: this.currentUser.id, // Correct property from DecodedToken
      dorm_id: this.dormId,
      score: this.newReviewScore,
      comment: this.newReviewComment
    }).subscribe({
      next: async (res) => {
        if (res.success) {
          this.newReviewScore = 0;
          this.newReviewComment = '';
          
          const toast = await this.toastController.create({
            message: 'ส่งรีวิวสำเร็จ ขอบคุณสำหรับความคิดเห็นของคุณ!',
            duration: 2500,
            position: 'bottom',
            color: 'success',
            icon: 'checkmark-circle-outline'
          });
          await toast.present();
          
      // Reload all data to ensure consistent state and new average score
          this.loadAllData();
        }
      },
      error: (err) => alert(err.error?.message || 'เกิดข้อผิดพลาดในการรีวิว')
    });
  }

  getParsedScore(score: string | undefined): number {
    if (!score) return 0;
    const parsed = Number(score);
    return isNaN(parsed) ? 0 : Math.round(parsed);
  }

  handleFacImageError(index: number) {
    this.facImageErrors[index] = true;
  }

  scrollGallery(direction: 'left' | 'right') {
    if (this.galleryContainer && this.galleryContainer.nativeElement) {
      const container = this.galleryContainer.nativeElement;
      const scrollAmount = container.clientWidth;
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  }

  async finalConfirm() {
    const toast = await this.toastController.create({
      message: 'ยืนยันการลงทะเบียนหอพักเรียบร้อยแล้ว!',
      duration: 3000,
      color: 'success',
      icon: 'checkmark-circle-outline'
    });
    await toast.present();
    this.navCtrl.navigateRoot('/');
  }

  goBackToEdit() {
    this.navCtrl.back();
  }
}
