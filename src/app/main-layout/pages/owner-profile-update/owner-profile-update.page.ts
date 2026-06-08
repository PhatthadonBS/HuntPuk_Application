import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonButton,
  IonLabel,
  IonToast,
  IonList,
  IonItem,
  IonInput,
  IonButtons,
  IonBackButton,
  ActionSheetController
} from '@ionic/angular/standalone';
import { UserServices } from 'src/app/services/userServices';
import { UserAllGetRes, UserUpdatePostReqForm } from 'src/app/model/user.model';
import { timer, finalize } from 'rxjs';
import { NavController, AlertController } from '@ionic/angular';
import { extractErrorMessage } from 'src/app/utils/error.util';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { person, personOutline, callOutline, arrowBackCircleOutline, personCircleOutline, cameraOutline, imageOutline, camera, close } from 'ionicons/icons';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-owner-profile-update',
  templateUrl: './owner-profile-update.page.html',
  styleUrls: ['./owner-profile-update.page.scss'],
  standalone: true,
  imports: [
    IonToast,
    IonLabel,
    IonButton,
    IonIcon,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonList,
    IonItem,
    IonInput,
    IonButtons,
    IonBackButton,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoadingUIComponent
  ],
})
export class OwnerProfileUpdatePage {
  user = signal<UserAllGetRes | null>(null);
  updateForm!: FormGroup;
  errMsg = signal<string | null>(null);
  succMsg = signal<string | null>(null);
  user_id = signal<number | null>(null);
  isLoading = signal<boolean>(false);

  selectedFile: File | null = null;
  imagePreview = signal<string | null>(null);

  constructor(
    private userSv: UserServices,
    private fb: FormBuilder,
    private navCtrl: NavController,
    private actRouter: ActivatedRoute,
    private alertController: AlertController,
    private actionSheetCtrl: ActionSheetController
  ) {
    addIcons({ person, personOutline, callOutline, arrowBackCircleOutline, personCircleOutline, cameraOutline, imageOutline, camera, close });
    this.updateForm = this.fb.group<UserUpdatePostReqForm>({
      username: this.fb.control(null),
      phone_number: this.fb.control(null),
      first_name: this.fb.control(null),
      last_name: this.fb.control(null)
    });
  }

  ionViewWillEnter() {
    let uid_param = this.actRouter.snapshot.queryParamMap.get('user_id');
    if (!uid_param) {
      uid_param = this.actRouter.snapshot.paramMap.get('user_id');
    }
    
    if (uid_param) {
      this.user_id.set(Number(uid_param)); 
      this.isLoading.set(true);
      this.userSv.getUserByID(Number(uid_param)).pipe(finalize(() => this.isLoading.set(false))).subscribe({
        next: (u: any) => {
          this.user.set(u);
          if (u.PROFILE_IMAGE) {
            this.imagePreview.set(u.PROFILE_IMAGE);
          }
          this.updateForm.patchValue({
            username: u.USERNAME,
            phone_number: u.PHONE_NUMBER,
            first_name: u.FIRST_NAME,
            last_name: u.LAST_NAME
          });
        },
        error: (err) => {
          this.errMsg.set(extractErrorMessage(err));
          timer(3000).subscribe(() => {
            this.navCtrl.navigateRoot('/');
          });
        }
      });
    } else {
      this.errMsg.set('not found user id');
      timer(3000).subscribe(() => {
        this.navCtrl.back();
      });
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  handleImageError() {
    this.imagePreview.set(null);
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
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const format = image.format || 'jpeg';
        this.selectedFile = new File([blob], `profile_${Date.now()}.${format}`, { type: `image/${format}` });
      }
    } catch (error) {
      console.error('Error taking picture', error);
    }
  }

  async confirmUpdate() {
    if (this.updateForm.invalid) return;

    const alert = await this.alertController.create({
      header: 'ยืนยันการบันทึก',
      message: 'คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลใช่หรือไม่?',
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'ยืนยัน',
          handler: () => {
            this.update();
          }
        }
      ]
    });

    await alert.present();
  }

  update() {
    if (this.updateForm.invalid) return;
    
    const formValues = this.updateForm.getRawValue();
    const formData = new FormData();
    
    if (formValues.username) formData.append('username', formValues.username);
    if (formValues.phone_number) formData.append('phone_number', formValues.phone_number);
    if (formValues.first_name) formData.append('first_name', formValues.first_name);
    if (formValues.last_name) formData.append('last_name', formValues.last_name);
    
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }
    
    this.isLoading.set(true);
    this.userSv.profileUpdate(this.user()!.USER_ID, formData as any).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: () => {
        this.errMsg.set(null);
        this.succMsg.set('แก้ไขข้อมูลเสร็จสิ้น');
        timer(1500).subscribe(() => {
          this.navCtrl.navigateRoot(['/owner-profile', this.user()!.USER_ID]);
        });
      },
      error: (err: any) => {
        this.succMsg.set(null);
        this.errMsg.set(extractErrorMessage(err));
      },
    });
  }
}

