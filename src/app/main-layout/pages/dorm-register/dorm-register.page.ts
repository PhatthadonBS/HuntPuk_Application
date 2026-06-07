import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton,
  IonIcon, IonGrid, IonRow, IonCol, IonCheckbox, IonTextarea, IonModal,
  IonFooter, IonAvatar, IonFab, IonFabButton, ToastController, NavController,
  IonImg, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  camera, image, pin, map, closeCircle, add, trash, arrowBackCircleOutline,
  checkmarkCircleOutline, alertCircleOutline, locationOutline, businessOutline,
  bedOutline, waterOutline, flashOutline, cubeOutline, informationCircleOutline,
  chevronForwardOutline, sendOutline, star
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DormServices } from 'src/app/services/dormServices';
import { MasterType, DormZone, FacilityItem } from 'src/app/model/dorm.model';
import { GoogleMapService } from 'src/app/services/google-map-service';
import { ActivatedRoute } from '@angular/router';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { finalize } from 'rxjs';

declare var google: any;

interface ImageState {
  file: File | null;
  preview: string | null;
}

@Component({
  selector: 'app-dorm-register',
  templateUrl: './dorm-register.page.html',
  styleUrls: ['./dorm-register.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton,
    IonIcon, IonGrid, IonRow, IonCol, IonCheckbox, IonTextarea, IonModal,
    IonFooter, IonAvatar, IonFab, IonFabButton, CommonModule, ReactiveFormsModule,
    FormsModule, LoadingUIComponent, IonImg
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DormRegisterPage implements OnInit, OnDestroy {
  @ViewChild('mapEl', { static: false }) mapEl!: ElementRef;

  dormForm: FormGroup;
  isLoading = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  dormId: number | null = null;
  userId: number | null = null;
  
  // Master Data
  dormTypes = signal<MasterType[]>([]);
  zones = signal<DormZone[]>([]);
  roomTypes = signal<MasterType[]>([]);
  bedTypes = signal<MasterType[]>([]);
  allFacilities = signal<FacilityItem[]>([]);
  facImageErrors = signal<Record<number, boolean>>({});

  // Image Management
  images: { [key: string]: ImageState } = {
    FRONT: { file: null, preview: null },
    LICENSE: { file: null, preview: null },
    CEILING: { file: null, preview: null },
    WALL: { file: null, preview: null },
    FLOOR: { file: null, preview: null },
    BATHROOM: { file: null, preview: null },
    BALCONY: { file: null, preview: null },
  };
  otherImages = signal<ImageState[]>([]);

  // Map Modal
  isMapModalOpen = signal<boolean>(false);
  map: any = null;
  private marker: any = null;
  tempLocation = signal<{ lat: number; lng: number } | null>(null);

  // New Facility Request
  customFacName: string = '';
  customFacIcon: ImageState = { file: null, preview: null };

  constructor(
    private fb: FormBuilder,
    private dormSv: DormServices,
    private gMapSv: GoogleMapService,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private alertCtrl: AlertController
  ) {
    addIcons({
      camera, image, pin, map, closeCircle, add, trash, arrowBackCircleOutline,
      checkmarkCircleOutline, alertCircleOutline, locationOutline, businessOutline,
      bedOutline, waterOutline, flashOutline, cubeOutline, informationCircleOutline,
      chevronForwardOutline, sendOutline, star
    });

    this.dormForm = this.fb.group({
      user_id: [null, Validators.required],
      name: ['', Validators.required],
      type_id: [null, Validators.required],
      zone_id: [null, Validators.required],
      address: ['', Validators.required],
      lat: [null, Validators.required],
      lng: [null, Validators.required],
      water_unit: [0, [Validators.required, Validators.min(0)]],
      elect_unit: [0, [Validators.required, Validators.min(0)]],
      water_lump: [0, [Validators.required, Validators.min(0)]],
      detail: [''],
      rooms: this.fb.array([]),
      facilities: this.fb.array([])
    });
  }

  get rooms() { return this.dormForm.get('rooms') as FormArray; }
  get facilities() { return this.dormForm.get('facilities') as FormArray; }

  ngOnInit() {
    const uId = this.route.snapshot.paramMap.get('user_id');
    const dId = this.route.snapshot.paramMap.get('dorm_id');

    if (uId) {
      this.userId = Number(uId);
      this.dormForm.patchValue({ user_id: this.userId });
    }

    if (dId) {
      this.dormId = Number(dId);
      this.isEditMode.set(true);
      this.loadDormData(this.dormId);
    }

    this.loadMasterData();
    if (!this.isEditMode()) {
      this.addRoom(); // Default 1 room for new reg
    }
  }

  loadDormData(id: number) {
    this.isLoading.set(true);
    this.dormSv.getDormById(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const d = res.data;
            this.dormForm.patchValue({
              name: d.DORM_NAME,
              type_id: d.DORM_TYPE_ID,
              zone_id: d.ZONE_ID,
              address: d.ADDRESS,
              lat: d.lat,
              lng: d.lng,
              water_unit: d.WATER_UNIT,
              elect_unit: d.ELECT_UNIT,
              water_lump: d.WATER_LUMP,
              detail: d.ADD_DORM_DATA
            });

            // Rebuild Rooms
            this.rooms.clear();
            if (d.rooms && d.rooms.length > 0) {
              d.rooms.forEach((r: any) => {
                const group = this.fb.group({
                  roomType: [r.ROOM_TYPE_ID, Validators.required],
                  bedType: [r.BED_TYPE_ID || 1, Validators.required],
                  perDay: [r.perDay || 0, [Validators.required, Validators.min(0)]],
                  perMonth: [r.PRICE || 0, [Validators.required, Validators.min(0)]],
                  perTerm: [r.perTerm || 0, [Validators.required, Validators.min(0)]],
                });
                this.rooms.push(group);
              });
            } else {
              this.addRoom();
            }

            // Patch Facilities
            this.dormSv.getFacilitiesOfDorm(id.toString()).subscribe(facRes => {
              if (Array.isArray(facRes)) {
                this.facilities.clear();
                facRes.forEach(f => {
                  this.facilities.push(this.fb.control(f.FAC_TYPE_ID));
                });
              }
            });

            // Map Images (Previews only)
            if (d.image) this.images['FRONT'].preview = d.image;
            
            // Map Room Component Images
            if (d.ceiling_img) this.images['CEILING'].preview = d.ceiling_img;
            if (d.wall_img) this.images['WALL'].preview = d.wall_img;
            if (d.floor_img) this.images['FLOOR'].preview = d.floor_img;
            if (d.bathroom_img) this.images['BATHROOM'].preview = d.bathroom_img;
            if (d.balcony_img) this.images['BALCONY'].preview = d.balcony_img;

            if (d.gallery && d.gallery.length > 0) {
              this.otherImages.set(d.gallery.map(url => ({ file: null, preview: url })));
            }
          }
        },
        error: (err) => {
          console.error(err);
          this.showToast('ไม่สามารถดึงข้อมูลหอพักได้', 'danger');
        }
      });
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  loadMasterData() {
    this.dormSv.getDormTypes().subscribe(data => this.dormTypes.set(data));
    this.dormSv.getZones().subscribe(res => { if (res.success) this.zones.set(res.data); });
    this.dormSv.getRoomTypes().subscribe(data => this.roomTypes.set(data));
    this.dormSv.getBedTypes().subscribe(data => this.bedTypes.set(data));
    this.dormSv.getFacilities().subscribe(res => { 
      if (res && res.success) {
        this.allFacilities.set(res.data); 
      } else if (Array.isArray(res)) {
        // Fallback for old API structure if any
        this.allFacilities.set(res);
      }
    });
  }

  addRoom() {
    const roomGroup = this.fb.group({
      roomType: [null, Validators.required],
      bedType: [null, Validators.required],
      perDay: [0, [Validators.required, Validators.min(0)]],
      perMonth: [0, [Validators.required, Validators.min(0)]],
      perTerm: [0, [Validators.required, Validators.min(0)]],
    });
    this.rooms.push(roomGroup);
  }

  removeRoom(index: number) {
    if (this.rooms.length > 1) {
      this.rooms.removeAt(index);
    }
  }

  toggleFacilitySelection(facId: number) {
    const currentFacs = this.facilities.value as number[];
    const index = currentFacs.indexOf(facId);
    
    if (index === -1) {
      this.facilities.push(this.fb.control(facId));
    } else {
      this.facilities.removeAt(index);
    }
  }

  handleFacImageError(facId: number) {
    this.facImageErrors.update(prev => ({ ...prev, [facId]: true }));
  }

  async selectImage(key: string, isOther: boolean = false, index: number = -1) {
    try {
      if (isOther && index === -1) {
        // Multi-select for "Other" images
        const currentCount = this.otherImages().length;
        if (currentCount >= 5) {
          this.showToast('อัปโหลดรูปภาพอื่นๆ ได้สูงสุด 5 รูป', 'warning');
          return;
        }

        const result = await Camera.pickImages({
          quality: 90,
          limit: 5 - currentCount
        });

        if (result.photos.length > 0) {
          for (const photo of result.photos) {
            const dataUrl = await this.getBase64FromPath(photo.webPath);
            const file = await this.dataUrlToFile(dataUrl, `other_${Date.now()}.webp`);
            this.otherImages.update(imgs => [...imgs, { file, preview: dataUrl }]);
          }
        }
        return;
      }

      // Single select for specific slots or replacement
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });

      if (image.dataUrl) {
        const file = await this.dataUrlToFile(image.dataUrl, `${key}_${Date.now()}.webp`);
        const state: ImageState = { file, preview: image.dataUrl };

        if (isOther) {
          this.otherImages.update(imgs => {
            const newImgs = [...imgs];
            newImgs[index] = state;
            return newImgs;
          });
        } else if (key === 'CUSTOM_FAC') {
          this.customFacIcon = state;
        } else {
          this.images[key] = state;
        }
      }
    } catch (e) {
      console.error('Image selection canceled or failed', e);
    }
  }

  private async getBase64FromPath(path: string): Promise<string> {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  removeImage(key: string, isOther: boolean = false, index: number = -1) {
    if (isOther) {
      this.otherImages.update(imgs => {
        const newImgs = [...imgs];
        newImgs.splice(index, 1);
        return newImgs;
      });
    } else if (key === 'CUSTOM_FAC') {
      this.customFacIcon = { file: null, preview: null };
    } else {
      this.images[key] = { file: null, preview: null };
    }
  }

  private async dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
    const res: Response = await fetch(dataUrl);
    const blob: Blob = await res.blob();
    return new File([blob], fileName, { type: 'image/webp' });
  }

  // --- Map Logic ---
  openMapModal() {
    this.isMapModalOpen.set(true);
    const currentLat = this.dormForm.get('lat')?.value;
    const currentLng = this.dormForm.get('lng')?.value;
    if (currentLat && currentLng) {
      this.tempLocation.set({ lat: currentLat, lng: currentLng });
    }
  }

  closeMapModal() {
    this.isMapModalOpen.set(false);
  }

  onMapModalDismissed() {
    this.destroyMap();
  }

  async onMapModalPresented(event: any) {
    const el = document.getElementById('map-canvas');
    if (!el) return;

    try {
      await this.gMapSv.load();
      const center = this.tempLocation() || { lat: 16.2458428, lng: 103.2492193 };
      
      this.map = new google.maps.Map(el, {
        center,
        zoom: 15,
        disableDefaultUI: false,
        zoomControl: true,
      });

      if (this.tempLocation()) {
        this.renderMarker(this.tempLocation()!);
      }

      this.map.addListener('click', (event: any) => {
        const latLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        this.tempLocation.set(latLng);
        this.renderMarker(latLng);
      });
    } catch (e) {
      console.error('Map init failed', e);
    }
  }

  renderMarker(pos: { lat: number; lng: number }) {
    if (this.marker) this.marker.setMap(null);
    this.marker = new google.maps.Marker({
      position: pos,
      map: this.map,
      animation: google.maps.Animation.DROP
    });
  }

  confirmLocation() {
    const loc = this.tempLocation();
    if (loc) {
      this.dormForm.patchValue({ lat: loc.lat, lng: loc.lng });
    }
    this.closeMapModal();
  }

  destroyMap() {
    this.map = null;
    this.marker = null;
  }

  async confirmAndRegister() {
    const alert = await this.alertCtrl.create({
      header: this.isEditMode() ? 'ยืนยันการแก้ไข?' : 'ยืนยันการลงทะเบียน?',
      message: this.isEditMode() 
        ? 'คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลหอพักใช่หรือไม่?' 
        : 'คุณต้องการส่งข้อมูลลงทะเบียนหอพักใช่หรือไม่?',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ยืนยัน',
          handler: () => this.executeSubmission()
        }
      ]
    });
    await alert.present();
  }

  async executeSubmission() {
    this.isLoading.set(true);
    const formVal = this.dormForm.getRawValue();

    // Step 1: Submit Text Data
    const textData = { ...formVal };
    // Backend expects strings for these in createDorm_api
    textData.facilities = JSON.stringify(formVal.facilities);
    textData.rooms = JSON.stringify(formVal.rooms);
    textData.new_fac_name = this.customFacName;

    if (this.isEditMode()) {
      this.dormSv.updateDorm(this.dormId!, textData)
        .subscribe({
          next: (res) => {
            if (res.success) {
              this.performImageUpload(this.dormId!);
            } else {
              this.isLoading.set(false);
              this.showToast('อัปเดตข้อมูลล้มเหลว', 'danger');
            }
          },
          error: (err) => {
            this.isLoading.set(false);
            console.error(err);
            this.showToast('เกิดข้อผิดพลาดในการอัปเดต', 'danger');
          }
        });
    } else {
      this.dormSv.registerDorm(textData)
        .subscribe({
          next: (res) => {
            if (res.success && res.dormId) {
              // Step 2: Upload Images
              this.performImageUpload(res.dormId);
            } else {
              this.isLoading.set(false);
              this.showToast('ลงทะเบียนล้มเหลว กรุณาลองใหม่อีกครั้ง', 'danger');
            }
          },
          error: (err) => {
            this.isLoading.set(false);
            console.error(err);
            this.showToast('เกิดข้อผิดพลาดในการลงทะเบียน', 'danger');
          }
        });
    }
  }

  async performImageUpload(dormId: number) {
    const formData = new FormData();

    // Only append if file is newly selected
    if (this.images['FRONT'].file) formData.append('FRONT_DORM_IMG', this.images['FRONT'].file);
    if (!this.isEditMode() && this.images['LICENSE'].file) formData.append('LICENSE_IMG', this.images['LICENSE'].file);
    
    if (this.images['CEILING'].file) formData.append('CEILING_IMG', this.images['CEILING'].file);
    if (this.images['WALL'].file) formData.append('WALL_IMG', this.images['WALL'].file);
    if (this.images['FLOOR'].file) formData.append('FLOOR_IMG', this.images['FLOOR'].file);
    if (this.images['BATHROOM'].file) formData.append('BATHROOM_IMG', this.images['BATHROOM'].file);
    if (this.images['BALCONY'].file) formData.append('BALCONY_IMG', this.images['BALCONY'].file);

    this.otherImages().forEach((img) => {
      if (img.file) formData.append('OTHER_IMG', img.file);
    });

    if (this.customFacIcon.file) {
      formData.append('FACILITY_IMG', this.customFacIcon.file);
    }

    // Check if anything to upload
    let hasFiles = false;
    formData.forEach(() => { hasFiles = true; });

    if (this.isEditMode() && !hasFiles) {
       this.isLoading.set(false);
       this.showToast('บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
       this.navCtrl.navigateRoot(`/my-dorm/${this.userId}`);
       return;
    }

    this.dormSv.uploadDormImages(dormId, formData)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.showToast(this.isEditMode() ? 'อัปเดตข้อมูลสำเร็จ' : 'ลงทะเบียนสำเร็จ', 'success');
          if (this.isEditMode()) {
            this.navCtrl.navigateRoot(`/my-dorm/${this.userId}`);
          } else {
            this.navCtrl.navigateForward(`/dorm-detail/${dormId}`, {
              queryParams: { preview: 'true' }
            });
          }
        },
        error: (err) => {
          console.error(err);
          const msg = this.isEditMode() ? 'อัปเดตข้อมูลสำเร็จ แต่รูปภาพบางส่วนไม่สามารถอัปโหลดได้' : 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาอัปโหลดใหม่ในหน้าแก้ไข';
          this.showToast(msg, 'warning');
          this.navCtrl.navigateRoot(`/my-dorm/${this.userId}`);
        }
      });
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}
