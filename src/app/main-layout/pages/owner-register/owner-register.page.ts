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
  NavController
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
  alertCircleOutline
} from 'ionicons/icons';
import { UserServices } from 'src/app/services/userServices';
import { AuthenService } from 'src/app/services/authenService';
import { UserDataGetRes } from 'src/app/model/user.model';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { finalize } from 'rxjs';

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
    private navCtrl: NavController
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
      alertCircleOutline
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

  async onSubmit() {
    if (!this.firstName() || !this.lastName() || !this.selectedFile) {
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
    formData.append('file', this.selectedFile);

    this.isLoading.set(true);
    this.userSv.requestDormOwner(formData).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.showToast('Registration submitted successfully! Please wait for admin approval.', 'success');
        this.navCtrl.navigateRoot('/');
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error submitting registration', err);
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
