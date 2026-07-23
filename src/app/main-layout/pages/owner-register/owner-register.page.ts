import { Component, signal } from '@angular/core';
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
  IonInput,
  IonButton,
  IonIcon,
  IonAvatar,
  IonThumbnail,
  IonFooter,
  ToastController,
  NavController,
  ActionSheetController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  mailOutline,
  callOutline,
  cameraOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  imageOutline,
  camera,
  close,
  arrowBackCircleOutline,
  globeOutline,
} from 'ionicons/icons';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { ActivatedRoute } from '@angular/router';
import { UserDataGetRes } from 'src/app/model/user.model';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { finalize } from 'rxjs';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';

@Component({
  selector: 'app-owner-register',
  templateUrl: './owner-register.page.html',
  styleUrls: ['./owner-register.page.scss'],
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
    IonInput,
    IonButton,
    IonIcon,
    IonAvatar,
    IonThumbnail,
    IonFooter,
    CommonModule,
    FormsModule,
    LoadingUIComponent,
  ],
})
export class OwnerRegisterPage {
  // Form State
  firstName = signal<string>('');
  lastName = signal<string>('');
  email = signal<string>('');
  phone = signal<string>('');
  facebook = signal<string>('');
  instagram = signal<string>('');
  telegram = signal<string>('');
  line = signal<string>('');
  twitter = signal<string>('');

  // Image State
  selectedFile: File | null = null;
  imagePreview = signal<string | null>(null);

  isLoading = signal<boolean>(false);
  currentUser = signal<UserDataGetRes | null>(null);
  targetUserId: number | null = null;
  isExistingOwner = signal<boolean>(false);

  constructor(
    private userSv: UserServices,
    public authSv: AuthenService,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
    private route: ActivatedRoute
  ) {
    addIcons({
      personOutline,
      mailOutline,
      callOutline,
      cameraOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      imageOutline,
      camera,
      close,
      arrowBackCircleOutline,
      globeOutline,
    });
  }

  ionViewWillEnter() {
    const idParam = this.route.snapshot.paramMap.get('user_id');
    if (idParam) {
      this.targetUserId = Number(idParam);
    }
    this.fetchUserProfile();
  }

  fetchUserProfile() {
    const user = this.authSv.currentUserValue;
    if (user) {
      const isAdmin = user.role === 3;
      if (isAdmin && !this.targetUserId) {
        this.firstName.set('');
        this.lastName.set('');
        this.email.set('');
        this.phone.set('');
        this.facebook.set('');
        this.instagram.set('');
        this.telegram.set('');
        this.line.set('');
        this.twitter.set('');
        this.imagePreview.set(null);
        this.selectedFile = null;
        return;
      }

      this.isLoading.set(true);
      const uidToFetch = this.targetUserId || user.id;
      this.userSv.getUserByID(uidToFetch).subscribe({
        next: (data: any) => {
          this.currentUser.set(data);
          this.email.set(data.EMAIL || '');
          this.phone.set(data.PHONE_NUMBER || '');

          if (data.FIRST_NAME) this.firstName.set(data.FIRST_NAME);
          if (data.LAST_NAME) this.lastName.set(data.LAST_NAME);
          if (data.PROFILE_IMAGE) this.imagePreview.set(data.PROFILE_IMAGE);
          if (data.FACEBOOK) this.facebook.set(data.FACEBOOK);
          if (data.INSTAGRAM) this.instagram.set(data.INSTAGRAM);
          if (data.TELEGRAM) this.telegram.set(data.TELEGRAM);
          if (data.LINE) this.line.set(data.LINE);
          if (data.X) this.twitter.set(data.X);

          // Mark as existing owner if DORM_OWNERS record exists
          this.isExistingOwner.set(!!data.FIRST_NAME);

          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้', err);
          this.isLoading.set(false);
          this.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้', 'danger');
        },
      });
    } else {
      this.navCtrl.navigateRoot('/login');
    }
  }

  handleImageError() {
    this.imagePreview.set(null);
  }

  async presentPhotoOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      mode: 'md',
      cssClass: 'minimal-action-sheet',
      buttons: [
        {
          text: 'ถ่ายภาพ',
          icon: 'camera-outline',
          handler: () => {
            this.takePicture(CameraSource.Camera);
          },
        },
        {
          text: 'เลือกจากอัลบั้ม',
          icon: 'image-outline',
          handler: () => {
            this.takePicture(CameraSource.Photos);
          },
        },
        {
          text: 'ยกเลิก',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: source,
      });

      if (image.webPath) {
        this.imagePreview.set(image.webPath);
        // Convert to File object for upload
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const format = image.format || 'jpeg';
        this.selectedFile = new File(
          [blob],
          `profile_${Date.now()}.${format}`,
          { type: `image/${format}` }
        );
      }
    } catch (error) {
      console.error('Error taking picture', error);
      // User cancelled or error occurred, handle silently or show toast if needed
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async onSubmit(override: boolean = false) {
    const user = this.authSv.currentUserValue;
    if (!user) return;

    const isAdmin = user.role === 3;
    const uidToSubmit = this.targetUserId || user.id;

    // Admin creating a brand-new owner (no existing profile loaded) → POST
    const useCreateFlow = isAdmin && !this.isExistingOwner() && !this.targetUserId;

    if (!this.firstName() || !this.lastName()) {
      this.showToast('กรุณากรอกชื่อและนามสกุลให้ครบถ้วน', 'warning');
      return;
    }

    if (useCreateFlow && !this.selectedFile && !override) {
      this.showToast('กรุณาเลือกรูปโปรไฟล์', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('user_id', uidToSubmit.toString());
    formData.append('email', this.email());
    formData.append('first_name', this.firstName());
    formData.append('last_name', this.lastName());
    formData.append('facebook', this.facebook());
    formData.append('instagram', this.instagram());
    formData.append('telegram', this.telegram());
    formData.append('line', this.line());
    formData.append('x', this.twitter());
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.isLoading.set(true);

    if (useCreateFlow) {
      // ── Admin: CREATE new owner via POST /user/dormOwner ──
      if (override) formData.append('override', 'true');

      this.userSv.requestDormOwner(formData).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.showToast('เพิ่มเจ้าของหอพักสำเร็จ', 'success');
          this.navCtrl.navigateRoot('/member-management');
        },
        error: async (err) => {
          this.isLoading.set(false);
          console.error('Error creating owner', err);

          if (err.status === 409 && err.error?.isPending) {
            const alert = await this.alertCtrl.create({
              header: 'มีคำขอรออยู่แล้ว',
              message: err.error.message,
              buttons: [
                { text: 'ยกเลิก', role: 'cancel' },
                { text: 'ยืนยันการแทนที่', handler: () => this.onSubmit(true) },
              ],
            });
            await alert.present();
            return;
          }

          this.showToast(err.error?.message || 'เพิ่มเจ้าของหอพักไม่สำเร็จ', 'danger');
        },
      });
    } else {
      // ── Owner updating self, or Admin updating existing owner via PUT /spec/user/:id ──
      const currentUserData = this.currentUser();
      const username = currentUserData?.USERNAME || '';
      const phone = currentUserData?.PHONE_NUMBER || this.phone();

      // PUT endpoint expects multipart with username + phone_number + owner fields
      const updateData = new FormData();
      updateData.append('username', username);
      updateData.append('phone_number', phone);
      updateData.append('first_name', this.firstName());
      updateData.append('last_name', this.lastName());
      updateData.append('facebook', this.facebook());
      updateData.append('line', this.line());
      updateData.append('instagram', this.instagram());
      updateData.append('x', this.twitter());
      updateData.append('telegram', this.telegram());
      if (this.selectedFile) {
        updateData.append('file', this.selectedFile);
      }

      this.userSv.profileUpdate(uidToSubmit, updateData).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.showToast(
            isAdmin ? 'อัปเดตข้อมูลเจ้าของหอพักสำเร็จ' : 'อัปเดตข้อมูลสำเร็จ',
            'success'
          );
          if (isAdmin) {
            this.navCtrl.navigateRoot('/member-management');
          } else {
            this.navCtrl.back();
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error updating owner', err);
          this.showToast(err.error?.message || 'อัปเดตข้อมูลไม่สำเร็จ', 'danger');
        },
      });
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      mode: 'ios',
    });
    await toast.present();
  }
  goBack() {
    this.navCtrl.back();
  }
}
