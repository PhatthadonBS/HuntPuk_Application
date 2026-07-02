import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
  IonRefresher,
  IonRefresherContent,
  ToastController,
  AlertController,
  NavController,
} from '@ionic/angular/standalone';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DormServices } from 'src/app/services/dormServices';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { DormDetail, ReviewItem } from 'src/app/model/dorm.model';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
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
  personCircleOutline,
  warningOutline,
  constructOutline,
  navigateOutline,
  chatbubbleOutline,
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
    IonRefresher,
    IonRefresherContent,
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingUIComponent,
  ],
})
export class DormDetailPage implements OnInit, OnDestroy {
  @ViewChild('galleryContainer', { static: false })
  galleryContainer!: ElementRef;

  dormId: number | null = null;
  dorm = signal<DormDetail | null>(null);
  reviews = signal<ReviewItem[]>([]);
  priceTypes = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  isFavorite = signal<boolean>(false);
  hasError = signal<boolean>(false);

  isPreview = signal<boolean>(false);
  isAdminReq = signal<boolean>(false);
  isEdit = signal<boolean>(false);
  avgScore = signal<number>(0);

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
    private alertController: AlertController,
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
      personCircleOutline,
      warningOutline,
      constructOutline,
      navigateOutline,
      chatbubbleOutline,
    });
  }

  ngOnInit() {
    this.userSub = this.authSv.user$.subscribe((user) => {
      this.currentUser = user;
      if (user && this.dormId) {
        this.checkIfFavorite();
      }
    });

    this.route.queryParams.subscribe((params) => {
      this.isPreview.set(params['preview'] === 'true');
      this.isAdminReq.set(params['adminReq'] === 'true');
      this.isEdit.set(params['isEdit'] === 'true');
    });
    const idParam = this.route.snapshot.paramMap.get('dorm_id');
    if (idParam) {
      this.dormId = Number(idParam);
      if (this.currentUser) {
        this.checkIfFavorite();
      }
      this.loadAllData();
    } else {
      this.hasError.set(true);
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    if (this.userSub) this.userSub.unsubscribe();
  }

  handleRefresh(event: any) {
    this.loadAllData(event);
  }

  loadAllData(event?: any) {
    if (!this.dormId) {
      if (event) event.target.complete();
      return;
    }
    if (!event) this.isLoading.set(true);
    this.hasError.set(false);

    // Record dorm view for statistics
    if (!this.isPreview() && !this.isAdminReq() && !event) {
      this.dormSv.recordDormView(this.dormId).subscribe();
    }

    forkJoin({
      dormDetails: this.dormSv.getDormById(this.dormId).pipe(
        catchError((err) => {
          console.error('Error fetching dorm details', err);
          return of(null);
        })
      ),
      dormReviews: this.dormSv.getReviewsByDormId(this.dormId).pipe(
        catchError((err) => {
          console.error('Error fetching reviews', err);
          return of(null);
        })
      ),
      priceTypesReq: this.dormSv.getPriceTypes().pipe(
        catchError((err) => {
          console.error('Error fetching price types', err);
          return of([]);
        })
      ),
    }).subscribe({
      next: ({ dormDetails, dormReviews, priceTypesReq }) => {
        if (dormDetails && dormDetails.success) {
          const dData = dormDetails.data;
          if (!dData.gallery) dData.gallery = [];

          // Combine room components into gallery for the album slider
          const roomParts = [
            dData.ceiling_img,
            dData.wall_img,
            dData.floor_img,
            dData.bathroom_img,
            dData.balcony_img,
          ];
          roomParts.forEach((img) => {
            if (img && !dData.gallery.includes(img)) {
              dData.gallery.push(img);
            }
          });

          // Combine front image with gallery for the album
          if (dData.image) {
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
          const sumScore = dormReviews.data.reduce(
            (sum: any, review: any) => Number(sum) + Number(review.SCORE),
            0
          );
          console.log(dormReviews.data);

          console.log(sumScore, dormReviews.data.length);
          this.avgScore.set(dormReviews.data.length > 0 ? sumScore / dormReviews.data.length : 0);
        }

        if (priceTypesReq) {
          this.priceTypes.set(
            Array.isArray(priceTypesReq)
              ? priceTypesReq
              : (priceTypesReq as any).data || []
          );
        }

        if (!event) this.isLoading.set(false);
        if (event) event.target.complete();
      },
      error: () => {
        this.hasError.set(true);
        if (!event) this.isLoading.set(false);
        if (event) event.target.complete();
      },
    });
  }

  checkIfFavorite() {
    if (!this.currentUser || !this.dormId) return;
    this.userSv.getMyFavorites(this.currentUser.id).subscribe({
      next: (res) => {
        if (res.success) {
          const isFav = res.data.some((f: any) => f.DORMID === this.dormId);
          this.isFavorite.set(isFav);
        }
      },
      error: (err) => console.error('Error fetching favorites', err),
    });
  }

  getPrice(room: any, typeId: number): number | null {
    if (room.prices && Array.isArray(room.prices)) {
      const p = room.prices.find((x: any) => x.priceTypeId === typeId);
      if (p && p.price > 0) return p.price;
    } else {
      // Fallback
      const pt = this.priceTypes().find((t) => t.id === typeId);
      if (pt) {
        if (pt.name.includes('เดือน') && room.PRICE) return room.PRICE;
        if (pt.name.includes('เดือน') && room.perMonth) return room.perMonth;
        if (pt.name.includes('เทอม') && room.perTerm) return room.perTerm;
        if (pt.name.includes('วัน') && room.perDay) return room.perDay;
      }
    }
    return null;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 1 || this.currentUser?.role === 3;
  }

  getStatusColor(statusId: number): string {
    switch (statusId) {
      case 1:
        return 'bg-emerald-600/90'; // Available
      case 2:
        return 'bg-amber-500/90'; // Almost full
      case 3:
        return 'bg-red-600/90'; // Full
      case 4:
        return 'bg-gray-600/90'; // Maintenance
      default:
        return 'bg-gray-600/90';
    }
  }

  getStatusIcon(statusId: number): string {
    switch (statusId) {
      case 1:
        return 'checkmark-circle-outline';
      case 2:
        return 'warning-outline';
      case 3:
        return 'alert-circle-outline';
      case 4:
        return 'construct-outline';
      default:
        return 'information-circle-outline';
    }
  }

  toggleFavorite() {
    if (!this.currentUser || !this.dormId) return;

    // Optimistic update
    const current = this.isFavorite();
    this.isFavorite.set(!current);

    if (current) {
      this.userSv.removeFavorite(this.dormId).subscribe({
        error: () => this.isFavorite.set(true), // revert on error
      });
    } else {
      this.userSv.addFavorite(this.dormId).subscribe({
        error: () => this.isFavorite.set(false), // revert on error
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

    this.dormSv
      .addReview({
        user_id: this.currentUser.id, // Correct property from DecodedToken
        dorm_id: this.dormId,
        score: this.newReviewScore,
        comment: this.newReviewComment,
      })
      .subscribe({
        next: async (res) => {
          if (res.success) {
            this.newReviewScore = 0;
            this.newReviewComment = '';

            const toast = await this.toastController.create({
              message: 'ส่งรีวิวสำเร็จ ขอบคุณสำหรับความคิดเห็นของคุณ!',
              duration: 2500,
              position: 'bottom',
              color: 'success',
              icon: 'checkmark-circle-outline',
            });
            await toast.present();

            // Reload all data to ensure consistent state and new average score
            this.loadAllData();
          }
        },
        error: (err) => alert(err.error?.message || 'เกิดข้อผิดพลาดในการรีวิว'),
      });
  }

  getParsedScore(score: number | string | undefined): number {
    if (score === undefined || score === null) return 0;
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
    const isEditing = this.isEdit();
    const alert = await this.alertController.create({
      header: isEditing ? 'ยืนยันการอัปเดตข้อมูล' : 'ยืนยันการลงทะเบียนหอพัก',
      message: isEditing
        ? 'คุณต้องการบันทึกการอัปเดตข้อมูลหอพักใช่หรือไม่?'
        : 'คุณต้องการยืนยันการลงทะเบียนหอพักใช่หรือไม่?',
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel',
        },
        {
          text: 'ยืนยัน',
          handler: async () => {
            const toast = await this.toastController.create({
              message: isEditing
                ? 'อัปเดตข้อมูลหอพักเรียบร้อยแล้ว!'
                : 'ยืนยันการลงทะเบียนหอพักเรียบร้อยแล้ว!',
              duration: 3000,
              color: 'success',
              icon: 'checkmark-circle-outline',
            });
            await toast.present();

            const d = this.dorm();
            if (d && d.USER_ID) {
              this.navCtrl.navigateRoot(`/my-dorm/${d.USER_ID}`);
            } else {
              this.navCtrl.navigateRoot('/');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  async approveRequest() {
    const dorm = this.dorm();
    if (!dorm || !this.dormId) return;

    const alert = await this.alertController.create({
      header: 'ยืนยันการอนุมัติหอพัก',
      message: `คุณต้องการอนุมัติหอพัก "${dorm.DORM_NAME}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'อนุมัติ',
          handler: () => {
            this.isLoading.set(true);
            this.dormSv
              .approveDormReq({ dorm_id: this.dormId!, approve_status: true })
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.navCtrl.navigateRoot(
                    ['/my-dorm', this.currentUser?.id],
                    {
                      queryParams: { segment: 'requests' },
                    }
                  );
                },
                error: (err) => {
                  console.error(err);
                },
              });
          },
        },
      ],
    });
    await alert.present();
  }

  async rejectRequest() {
    const dorm = this.dorm();
    if (!dorm || !this.dormId) return;

    const alert = await this.alertController.create({
      header: 'ปฏิเสธคำร้องขอ',
      message: `ปฏิเสธหอพัก "${dorm.DORM_NAME}"\n\nระบุเหตุผล (ถ้ามี):`,
      inputs: [
        {
          name: 'msg',
          type: 'textarea',
          placeholder: 'ระบุเหตุผลการปฏิเสธคำร้องขอ...',
        },
      ],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ปฏิเสธ',
          role: 'destructive',
          handler: (data) => {
            this.isLoading.set(true);
            this.dormSv
              .approveDormReq({
                dorm_id: this.dormId!,
                approve_status: false,
                msg: data.msg,
              })
              .pipe(finalize(() => this.isLoading.set(false)))
              .subscribe({
                next: () => {
                  this.navCtrl.navigateRoot(
                    ['/my-dorm', this.currentUser?.id],
                    {
                      queryParams: { segment: 'requests' },
                    }
                  );
                },
                error: (err) => {
                  console.error(err);
                },
              });
          },
        },
      ],
    });
    await alert.present();
  }

  goBackToEdit() {
    this.navCtrl.back();
  }

  goBack() {
    this.navCtrl.back();
  }

  goToOwnerProfile() {
    this.navCtrl.navigateRoot(
      `/owner-profile/${
        (this.dorm()?.USER_ID, { queryParams: { adminView: 'true' } })
      }`
    );
  }
}
