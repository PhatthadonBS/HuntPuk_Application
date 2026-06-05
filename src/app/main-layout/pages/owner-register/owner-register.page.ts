import { Component, OnInit, signal } from '@angular/core';
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
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, 
  mailOutline, 
  callOutline, 
  logoFacebook, 
  logoInstagram, 
  paperPlaneOutline, 
  chatbubbleOutline, 
  logoTwitter, 
  cameraOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  imageOutline,
  camera
} from 'ionicons/icons';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { UserDataGetRes } from 'src/app/model/user.model';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { finalize } from 'rxjs';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

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
    LoadingUIComponent
  ]
})
export class OwnerRegisterPage implements OnInit {
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

  constructor(
    private userSv: UserServices,
    private authSv: AuthenService,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController
  ) {
    addIcons({
      personOutline,
      mailOutline,
      callOutline,
      logoFacebook,
      logoInstagram,
      paperPlaneOutline,
      chatbubbleOutline,
      logoTwitter,
      cameraOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      imageOutline,
      camera
    });
  }

  ngOnInit() {
    this.fetchUserProfile();
  }

  fetchUserProfile() {
    const user = this.authSv.currentUserValue;
    if (user) {
      this.isLoading.set(true);
      this.userSv.getUserByID(user.id).subscribe({
        next: (data) => {
          this.currentUser.set(data);
          this.email.set(data.EMAIL);
          this.phone.set(data.PHONE_NUMBER);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error fetching user profile', err);
          this.isLoading.set(false);
          this.showToast('Failed to load user profile', 'danger');
        }
      });
    } else {
      this.navCtrl.navigateRoot('/login');
    }
  }

  async presentPhotoOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Profile Photo',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => {
            this.takePicture(CameraSource.Camera);
          }
        },
        {
          text: 'Choose from Gallery',
          icon: 'image-outline',
          handler: () => {
            this.takePicture(CameraSource.Photos);
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async takePicture(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: source
      });

      if (image.webPath) {
        this.imagePreview.set(image.webPath);
        // Convert to File object for upload
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const format = image.format || 'jpeg';
        this.selectedFile = new File([blob], `profile_${Date.now()}.${format}`, { type: `image/${format}` });
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
    if (!this.firstName() || !this.lastName() || (!this.selectedFile && !override)) {
      this.showToast('Please fill in required fields and select a profile image', 'warning');
      return;
    }

    const user = this.authSv.currentUserValue;
    if (!user) return;

    const formData = new FormData();
    formData.append('user_id', user.id.toString());
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
    if (override) {
        formData.append('override', 'true');
    }

    this.isLoading.set(true);
    this.userSv.requestDormOwner(formData).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.showToast('Registration submitted successfully! Please wait for admin approval.', 'success');
        this.navCtrl.navigateRoot('/');
      },
      error: async (err) => {
        this.isLoading.set(false);
        console.error('Error submitting registration', err);
        
        // Handle pending request override logic
        if (err.status === 409 && err.error?.isPending) {
          const alert = await this.alertCtrl.create({
            header: 'Warning',
            message: err.error.message,
            buttons: [
              {
                text: 'Cancel',
                role: 'cancel'
              },
              {
                text: 'Confirm Override',
                handler: () => {
                  this.onSubmit(true);
                }
              }
            ]
          });
          await alert.present();
          return;
        }

        const errMsg = err.error?.message || 'Failed to submit registration';
        this.showToast(errMsg, 'danger');
      }
    });
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
      mode: 'ios'
    });
    await toast.present();
  }
}
