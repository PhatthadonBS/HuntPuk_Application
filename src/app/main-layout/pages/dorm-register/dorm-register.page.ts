import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
} from '@angular/core';
import { Location, CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonCheckbox,
  IonTextarea,
  IonModal,
  IonFooter,
  IonAvatar,
  IonFab,
  IonFabButton,
  ToastController,
  NavController,
  IonImg,
  AlertController,
  IonSegment,
  IonSegmentButton,
  IonSearchbar,
  IonList,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  camera,
  image,
  pin,
  map,
  closeCircle,
  add,
  trash,
  arrowBackCircleOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  locationOutline,
  businessOutline,
  bedOutline,
  waterOutline,
  flashOutline,
  cubeOutline,
  informationCircleOutline,
  chevronForwardOutline,
  sendOutline,
  star,
  personCircleOutline,
  cameraOutline,
  imageOutline,
  imagesOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DormServices } from 'src/app/services/dormServices';
import { MasterType, DormZone, FacilityItem } from 'src/app/model/dorm.model';
import { GoogleMapService } from 'src/app/services/google-map-service';
import { ActivatedRoute } from '@angular/router';
import { UserServices } from 'src/app/services/userServices';
import { UserAllGetRes } from 'src/app/model/user.model';
import { AuthenService } from 'src/app/services/authenService';
import { LoadingUIComponent } from '../../components/loading-ui/loading-ui.component';
import { finalize, lastValueFrom } from 'rxjs';

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
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonCheckbox,
    IonTextarea,
    IonModal,
    IonFooter,
    IonAvatar,
    IonFab,
    IonFabButton,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    LoadingUIComponent,
    IonImg,
    IonSegment,
    IonSegmentButton,
    IonSearchbar,
    IonList,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DormRegisterPage implements OnInit, OnDestroy {
  @ViewChild('mapEl', { static: false }) mapEl!: ElementRef;
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  dormForm: FormGroup;
  isLoading = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  dormId: number | null = null;
  userId: number | null = null;
  isDraftRegistration = false;
  isAdmin = signal<boolean>(false);
  dormOwners = signal<UserAllGetRes[]>([]);
  ownerSearchText = signal<string>('');
  isOwnerModalOpen = signal<boolean>(false);

  filteredOwners = computed(() => {
    const search = this.ownerSearchText().toLowerCase().trim();
    if (!search) return this.dormOwners();
    return this.dormOwners().filter(
      (o) =>
        o.FIRST_NAME?.toLowerCase().includes(search) ||
        o.LAST_NAME?.toLowerCase().includes(search) ||
        o.USERNAME.toLowerCase().includes(search)
    );
  });

  // Wizard State
  currentStep = signal<number>(1);

  // Master Data
  dormTypes = signal<MasterType[]>([]);
  zones = signal<DormZone[]>([]);
  roomTypes = signal<MasterType[]>([]);
  bedTypes = signal<MasterType[]>([]);
  priceTypes = signal<MasterType[]>([]);
  allFacilities = signal<FacilityItem[]>([]);
  facImageErrors = signal<Record<number, boolean>>({});
  customFacReqCount = signal<number>(0);

  // Image Management
  images: { [key: string]: ImageState } = {
    FRONT: { file: null, preview: null },
    LICENSE: { file: null, preview: null },
    CEILING: { file: null, preview: null },
    WALL: { file: null, preview: null },
    FLOOR: { file: null, preview: null },
    BED: { file: null, preview: null },
    BATHROOM: { file: null, preview: null },
    BALCONY: { file: null, preview: null },
  };
  otherImages = signal<ImageState[]>([
    { file: null, preview: null },
    { file: null, preview: null },
    { file: null, preview: null },
    { file: null, preview: null },
    { file: null, preview: null },
  ]);

  // Map Modal
  isMapModalOpen = signal<boolean>(false);
  map: any = null;
  private marker: any = null;
  zoneMarkers: any[] = [];
  zoneCircles: any[] = [];
  tempLocation = signal<{ lat: number; lng: number } | null>(null);

  // New Facility Request
  customFacName: string = '';
  customFacIcon: ImageState = { file: null, preview: null };

  constructor(
    private fb: FormBuilder,
    private dormSv: DormServices,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private gMapSv: GoogleMapService,
    private cdr: ChangeDetectorRef,
    private userSv: UserServices,
    private authSv: AuthenService,
    private location: Location,
    private actionSheetCtrl: ActionSheetController
  ) {
    addIcons({
      camera,
      image,
      pin,
      map,
      closeCircle,
      add,
      trash,
      arrowBackCircleOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      locationOutline,
      businessOutline,
      bedOutline,
      waterOutline,
      flashOutline,
      cubeOutline,
      informationCircleOutline,
      chevronForwardOutline,
      sendOutline,
      star,
      personCircleOutline,
      cameraOutline,
      imageOutline,
      imagesOutline,
    });

    this.dormForm = this.fb.group({
      user_id: [null],
      name: ['', Validators.required],
      type_id: [null, Validators.required],
      zone_id: [null, Validators.required],
      address: ['', Validators.required],
      lat: [null, Validators.required],
      lng: [null, Validators.required],
      water_unit: [null, [Validators.required, Validators.min(0)]],
      elect_unit: [null, [Validators.required, Validators.min(0)]],
      water_lump: [0, [Validators.required, Validators.min(0)]],
      detail: [''],
      rooms: this.fb.array([]),
      facilities: this.fb.array([]),
    });
  }

  get rooms() {
    return this.dormForm.get('rooms') as FormArray;
  }
  get facilities() {
    return this.dormForm.get('facilities') as FormArray;
  }

  async ngOnInit() {
    const uId = this.route.snapshot.paramMap.get('user_id');
    const dId = this.route.snapshot.paramMap.get('dorm_id');

    if (uId) {
      this.userId = Number(uId);
      this.dormForm.patchValue({ user_id: this.userId });
    }

    if (dId) {
      this.dormId = Number(dId);
      this.isEditMode.set(true);
    }

    await this.loadMasterData();

    if (!this.isEditMode()) {
      this.loadCustomFacReqCount();
    } else {
      this.loadDormData(this.dormId!);
    }

    const userObj = this.authSv.currentUserValue;
    if (userObj) {
      if (userObj.role === 1 || userObj.role === 3) {
        this.isAdmin.set(true);
        this.userSv.getDormOwners().subscribe({
          next: (owners) => {
            if (Array.isArray(owners)) {
              if (!owners.find((o) => o.USER_ID === userObj.id)) {
                this.userSv.getUserByID(userObj.id).subscribe({
                  next: (res: any) => {
                    const uData = res.data || res;
                    owners.unshift({
                      USER_ID: userObj.id,
                      USERNAME: uData?.USERNAME || 'Admin',
                      EMAIL: uData?.EMAIL || '',
                      PHONE_NUMBER: uData?.PHONE_NUMBER || '',
                      ROLE_TYPE_ID: userObj.role,
                      ACCOUNT_STATUS: userObj.status,
                      FIRST_NAME: 'ตัวเอง',
                      LAST_NAME: '(ผู้ดูแลระบบ)',
                      PROFILE_IMAGE: '',
                    });
                    this.dormOwners.set(owners);
                  },
                  error: () => {
                    owners.unshift({
                      USER_ID: userObj.id,
                      USERNAME: 'Admin',
                      EMAIL: '',
                      PHONE_NUMBER: '',
                      ROLE_TYPE_ID: userObj.role,
                      ACCOUNT_STATUS: userObj.status,
                      FIRST_NAME: 'ตัวเอง',
                      LAST_NAME: '(ผู้ดูแลระบบ)',
                      PROFILE_IMAGE: '',
                    });
                    this.dormOwners.set(owners);
                  },
                });
              } else {
                this.dormOwners.set(owners);
              }
            }
          },
          error: (err) => console.error('Failed to load dorm owners', err),
        });
      }
    }

    if (!this.isEditMode()) {
      this.addRoom(); // Default 1 room for new reg
    }
  }

  // --- Wizard Navigation ---
  setStep(step: number) {
    this.currentStep.set(step);
  }

  nextStep() {
    const current = this.currentStep();
    if (current < 5) {
      this.currentStep.set(current + 1);
      this.scrollToTop();
    }
  }

  prevStep() {
    const current = this.currentStep();
    if (current > 1) {
      this.currentStep.set(current - 1);
      this.scrollToTop();
    }
  }

  segmentChanged(event: any) {
    this.setStep(Number(event.detail.value));
    this.scrollToTop();
  }

  handleBack() {
    if (this.currentStep() > 1) {
      this.prevStep();
    } else {
      this.navCtrl.back();
    }
  }

  private scrollToTop() {
    if (this.content) {
      this.content.scrollToTop(300);
    } else {
      const content = document.querySelector(
        'ion-content.dorm-register-content'
      );
      if (content) {
        (content as any).scrollToTop(300);
      }
    }
  }

  loadDormData(id: number) {
    this.isLoading.set(true);
    this.dormSv
      .getDormById(id)
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
              detail: d.ADD_DORM_DATA,
              user_id: d.USER_ID,
            });

            // Ensure the original owner is in the dormOwners list so their name displays properly
            if (d.USER_ID && this.isAdmin()) {
              const currentOwners = this.dormOwners();
              if (!currentOwners.find((o) => o.USER_ID === d.USER_ID)) {
                currentOwners.push({
                  USER_ID: d.USER_ID,
                  FIRST_NAME: d.FIRST_NAME || '',
                  LAST_NAME: d.LAST_NAME || '',
                  USERNAME: '(เจ้าของเดิม)',
                  EMAIL: '',
                  PHONE_NUMBER: '',
                  ROLE_TYPE_ID: 2,
                  ACCOUNT_STATUS: 1,
                  PROFILE_IMAGE: '',
                });
                this.dormOwners.set([...currentOwners]);
              }
            }

            if (d.lat && d.lng) {
              this.tempLocation.set({ lat: Number(d.lat), lng: Number(d.lng) });
            }

            // Rebuild Rooms
            this.rooms.clear();
            if (d.rooms && d.rooms.length > 0) {
              d.rooms.forEach((r: any) => {
                this.addRoom(r);
              });
            } else {
              this.addRoom();
            }

            // Patch Facilities
            this.dormSv
              .getFacilitiesOfDorm(id.toString())
              .subscribe((facRes) => {
                if (Array.isArray(facRes)) {
                  this.facilities.clear();
                  facRes.forEach((f) => {
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
            if (d.bed_img) this.images['BED'].preview = d.bed_img;
            if (d.bathroom_img)
              this.images['BATHROOM'].preview = d.bathroom_img;
            if (d.balcony_img) this.images['BALCONY'].preview = d.balcony_img;

            if (d.gallery && d.gallery.length > 0) {
              const validGallery = d.gallery.filter(
                (url: string) => url && url.trim() !== ''
              );
              const filledGallery: ImageState[] = Array(5).fill(null).map(() => ({ file: null, preview: null }));
              validGallery.forEach((url: string, i: number) => {
                if (i < 5) filledGallery[i] = { file: null, preview: url };
              });
              this.otherImages.set(filledGallery);
            }

            this.loadCustomFacReqCount();
          }
        },
        error: (err) => {
          console.error(err);
          this.showToast('ไม่สามารถดึงข้อมูลหอพักได้', 'danger');
        },
      });
  }

  ngOnDestroy() {
    this.destroyMap();
  }

  loadCustomFacReqCount() {
    const userId = this.dormForm.value.user_id || this.userId;
    this.dormSv.getFacilityReqCount(userId).subscribe({
      next: (res) => {
        if (res.success) {
          this.customFacReqCount.set(res.count);
        }
      },
      error: (err) => console.error(err),
    });
  }

  async loadMasterData() {
    try {
      const [dTypes, zRes, rTypes, bTypes, facRes, pTypes] = await Promise.all([
        lastValueFrom(this.dormSv.getDormTypes()),
        lastValueFrom(this.dormSv.getZones()),
        lastValueFrom(this.dormSv.getRoomTypes()),
        lastValueFrom(this.dormSv.getBedTypes()),
        lastValueFrom(this.dormSv.getFacilities()),
        lastValueFrom(this.dormSv.getPriceTypes()),
      ]);

      this.dormTypes.set(dTypes);
      if (zRes && zRes.success) this.zones.set(zRes.data);
      this.roomTypes.set(rTypes);
      this.bedTypes.set(bTypes);
      if (facRes && facRes.success) {
        this.allFacilities.set(facRes.data);
      } else if (Array.isArray(facRes)) {
        this.allFacilities.set(facRes);
      }
      this.priceTypes.set(pTypes);
    } catch (e) {
      console.error('Failed to load master data', e);
    }
  }

  getPricesFormArray(roomIndex: number): FormArray {
    return this.rooms.at(roomIndex).get('prices') as FormArray;
  }

  addRoom(existingData?: any) {
    const pricesArray = this.fb.array<FormGroup>([]);

    // Create an input for EVERY active price type from DB
    for (const pt of this.priceTypes()) {
      let existingVal = 0;
      if (existingData && existingData.prices) {
        const found = existingData.prices.find(
          (p: any) => p.priceTypeId === pt.id
        );
        if (found) existingVal = found.price;
      } else if (existingData) {
        // Fallback for older data format
        if (pt.name.includes('เดือน') && existingData.PRICE)
          existingVal = existingData.PRICE;
        if (pt.name.includes('เดือน') && existingData.perMonth)
          existingVal = existingData.perMonth;
        if (pt.name.includes('เทอม') && existingData.perTerm)
          existingVal = existingData.perTerm;
        if (pt.name.includes('วัน') && existingData.perDay)
          existingVal = existingData.perDay;
      }

      pricesArray.push(
        this.fb.group({
          priceTypeId: [pt.id],
          price: [existingVal, [Validators.required, Validators.min(0)]],
        })
      );
    }

    const roomGroup = this.fb.group({
      roomType: [
        existingData ? existingData.ROOM_TYPE_NAME : null,
        Validators.required,
      ],
      bedType: [
        existingData ? existingData.BED_TYPE_ID || 1 : null,
        Validators.required,
      ],
      prices: pricesArray,
    });
    this.rooms.push(roomGroup);
  }

  removeRoom(index: number) {
    if (!confirm('ต้องการลบห้องพักหรือไม่')) return;
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
    this.facImageErrors.update((prev) => ({ ...prev, [facId]: true }));
  }

  async selectImage(key: string, isOther = false, index: number = -1) {
    try {
      const buttons: any[] = [
        {
          text: 'ถ่ายภาพ',
          icon: 'camera-outline',
          handler: () => {
            this.processImageSelection(key, isOther, index, CameraSource.Camera);
          },
        },
        {
          text: 'เลือกจากอัลบั้ม',
          icon: 'image-outline',
          handler: () => {
            this.processImageSelection(key, isOther, index, CameraSource.Photos);
          },
        },
      ];

      if (isOther) {
        buttons.push({
          text: 'เลือกหลายรูป (เรียงตามลำดับช่องว่าง)',
          icon: 'images-outline',
          handler: async () => {
            const emptySlots = this.otherImages().filter((img) => !img.preview).length;
            if (emptySlots === 0) {
              this.showToast('คุณอัปโหลดครบ 5 รูปแล้ว', 'warning');
              return;
            }

            const result = await Camera.pickImages({
              quality: 90,
              limit: emptySlots,
            });

            if (result.photos.length > 0) {
              const newImgs = [...this.otherImages()];
              let photoIndex = 0;

              // First try to fill the clicked slot if it's empty
              if (index >= 0 && !newImgs[index].preview && photoIndex < result.photos.length) {
                const photo = result.photos[photoIndex++];
                const dataUrl = await this.getBase64FromPath(photo.webPath);
                const file = await this.dataUrlToFile(
                  dataUrl,
                  `other_${Date.now()}.webp`
                );
                newImgs[index] = { file, preview: dataUrl };
              }

              // Fill remaining empty slots
              for (let i = 0; i < 5; i++) {
                if (!newImgs[i].preview && photoIndex < result.photos.length) {
                  const photo = result.photos[photoIndex++];
                  const dataUrl = await this.getBase64FromPath(photo.webPath);
                  const file = await this.dataUrlToFile(
                    dataUrl,
                    `other_${Date.now()}.webp`
                  );
                  newImgs[i] = { file, preview: dataUrl };
                }
              }

              this.otherImages.set(newImgs);
              this.cdr.detectChanges();
            }
          },
        });
      } else {
        const componentKeys = ['CEILING', 'WALL', 'FLOOR', 'BED', 'BATHROOM', 'BALCONY'];
        if (componentKeys.includes(key)) {
          buttons.push({
            text: 'เลือกหลายรูป (เติมช่องว่างรูปห้องที่เหลือ)',
            icon: 'images-outline',
            handler: async () => {
              const emptyKeys = componentKeys.filter((k) => !this.images[k].preview);
              if (emptyKeys.length === 0) {
                this.showToast('คุณอัปโหลดรูปภายในห้องครบแล้ว', 'warning');
                return;
              }

              const result = await Camera.pickImages({
                quality: 90,
                limit: emptyKeys.length,
              });

              if (result.photos.length > 0) {
                let photoIndex = 0;

                // First try to fill the clicked key if it's empty
                if (!this.images[key].preview && photoIndex < result.photos.length) {
                  const photo = result.photos[photoIndex++];
                  const dataUrl = await this.getBase64FromPath(photo.webPath);
                  const file = await this.dataUrlToFile(
                    dataUrl,
                    `${key}_${Date.now()}.webp`
                  );
                  this.images[key] = { file, preview: dataUrl };
                }

                // Fill remaining empty component slots
                for (const k of componentKeys) {
                  if (!this.images[k].preview && photoIndex < result.photos.length) {
                    const photo = result.photos[photoIndex++];
                    const dataUrl = await this.getBase64FromPath(photo.webPath);
                    const file = await this.dataUrlToFile(
                      dataUrl,
                      `${k}_${Date.now()}.webp`
                    );
                    this.images[k] = { file, preview: dataUrl };
                  }
                }

                this.cdr.detectChanges();
              }
            },
          });
        }
      }

      buttons.push({
        text: 'ยกเลิก',
        role: 'cancel',
      });

      const actionSheet = await this.actionSheetCtrl.create({
        mode: 'md',
        cssClass: 'minimal-action-sheet',
        buttons: buttons,
      });
      await actionSheet.present();
    } catch (e) {
      console.error('Image selection canceled or failed', e);
    }
  }

  private async processImageSelection(
    key: string,
    isOther: boolean,
    index: number,
    source: CameraSource
  ) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source,
      });

      if (image.dataUrl) {
        const file = await this.dataUrlToFile(
          image.dataUrl,
          `${key}_${Date.now()}.webp`
        );
        const state: ImageState = { file, preview: image.dataUrl };

        if (isOther) {
          this.otherImages.update((imgs) => {
            const newImgs = [...imgs];
            newImgs[index] = state;
            return newImgs;
          });
        } else if (key === 'CUSTOM_FAC') {
          this.customFacIcon = state;
        } else {
          this.images[key] = state;
        }
        this.cdr.detectChanges();
      }
    } catch (e) {
      console.error('Image selection canceled or failed', e);
    }
  }

  private async getBase64FromPath(path: string | undefined): Promise<string> {
    if (!path) return '';
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

  removeImage(type: string, isOther = false, index?: number) {
    if (isOther && index !== undefined) {
      const current = [...this.otherImages()];
      current[index] = { file: null, preview: null };
      this.otherImages.set(current);
    } else if (type === 'CUSTOM_FAC') {
      this.customFacIcon = { file: null, preview: null };
    } else {
      this.images[type] = { file: null, preview: null };
    }
    this.cdr.detectChanges();
  }

  handleImageError(event: any) {
    event.target.src = 'https://placehold.co/400x300?text=error';
  }

  handleAvatarError(event: any) {
    event.target.src = 'https://ionicframework.com/docs/img/demos/avatar.svg';
  }

  private async dataUrlToFile(
    dataUrl: string,
    fileName: string
  ): Promise<File> {
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
      const center = this.tempLocation() || {
        lat: 16.2458428,
        lng: 103.2492193,
      };

      this.map = new google.maps.Map(el, {
        center,
        zoom: 15,
        disableDefaultUI: true,
        clickableIcons: false,
        styles: [
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }],
          },
          {
            featureType: 'transit',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      if (this.tempLocation()) {
        this.renderMarker(this.tempLocation()!);
      }

      this.map.addListener('click', (event: any) => {
        const latLng = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        this.tempLocation.set(latLng);
        this.renderMarker(latLng);
      });

      this.renderZoneMarkers();
    } catch (e) {
      console.error('Map init failed', e);
    }
  }

  renderMarker(pos: { lat: number; lng: number }) {
    if (this.marker) this.marker.setMap(null);
    this.marker = new google.maps.Marker({
      position: pos,
      map: this.map,
      clickable: false,
    });
  }

  confirmLocation() {
    const loc = this.tempLocation();
    if (loc) {
      this.dormForm.patchValue({ lat: loc.lat, lng: loc.lng });

      const currentAddress = this.dormForm.get('address')?.value;
      if (!currentAddress || currentAddress.trim() === '') {
        try {
          if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: loc }, (results: any, status: any) => {
              if (status === 'OK' && results && results.length > 0) {
                const formattedAddress = results[0].formatted_address;
                this.dormForm.patchValue({ address: formattedAddress });
                this.cdr.detectChanges();
              }
            });
          }
        } catch (e) {
          console.error('Geocoder failed', e);
        }
      }
    }
    this.closeMapModal();
  }

  destroyMap() {
    if (this.zoneMarkers) {
      this.zoneMarkers.forEach((m) => m.setMap(null));
    }
    if (this.zoneCircles) {
      this.zoneCircles.forEach((c) => c.setMap(null));
    }
    this.zoneMarkers = [];
    this.zoneCircles = [];
    this.map = null;
    this.marker = null;
  }

  renderZoneMarkers() {
    this.zones().forEach((zone) => {
      if (zone.lat && zone.lng) {
        const marker = new google.maps.Marker({
          position: { lat: Number(zone.lat), lng: Number(zone.lng) },
          map: this.map,
          label: {
            text: zone.ZONE_NAME,
            color: '#4285F4',
            fontSize: '14px',
            fontWeight: 'bold',
            className: 'zone-marker-label',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            labelOrigin: new google.maps.Point(0, 2.5),
          },
          clickable: false,
        });
        this.zoneMarkers.push(marker);

        const circle = new google.maps.Circle({
          strokeColor: '#eab308', // yellow-500
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#fef08a', // yellow-200
          fillOpacity: 0.25,
          map: this.map,
          center: { lat: Number(zone.lat), lng: Number(zone.lng) },
          radius: 500,
          clickable: false,
        });
        this.zoneCircles.push(circle);
      }
    });
  }

  openOwnerModal() {
    this.isOwnerModalOpen.set(true);
  }

  closeOwnerModal() {
    this.isOwnerModalOpen.set(false);
  }

  selectOwner(userId: number) {
    this.dormForm.patchValue({ user_id: userId });
    this.closeOwnerModal();
  }

  get selectedOwnerName() {
    const uId = this.dormForm.get('user_id')?.value;
    if (!uId) return 'เลือกเจ้าของหอพัก';
    const owner = this.dormOwners().find((o) => o.USER_ID === uId);
    if (owner)
      return `${owner.FIRST_NAME || ''} ${owner.LAST_NAME || ''} (${
        owner.USERNAME
      })`;
    return 'เลือกเจ้าของหอพัก';
  }

  getInvalidStep(): number | null {
    const controls = this.dormForm.controls;

    if (
      controls['name'].invalid ||
      controls['type_id'].invalid ||
      controls['zone_id'].invalid ||
      controls['address'].invalid ||
      controls['lat'].invalid ||
      controls['lng'].invalid
    ) {
      return 1;
    }

    if (controls['rooms'].invalid) {
      return 2;
    }

    if (
      controls['water_unit'].invalid ||
      controls['elect_unit'].invalid ||
      controls['water_lump'].invalid
    ) {
      return 3;
    }

    return null;
  }

  async confirmAndRegister() {
    if (this.dormForm.invalid) {
      this.dormForm.markAllAsTouched();
      const invalidStep = this.getInvalidStep();
      if (invalidStep) {
        this.setStep(invalidStep);
        this.scrollToTop();
      }
      this.showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
      return;
    }
    await this.executeSubmission();
  }

  async executeSubmission() {
    this.isLoading.set(true);
    const formVal = this.dormForm.getRawValue();

    // Step 1: Submit Text Data
    const textData = { ...formVal };
    // Backend expects strings for these in createDorm_api
    textData.facilities = JSON.stringify(formVal.facilities);
    textData.roomTypes = JSON.stringify(formVal.rooms);
    if (this.customFacName && this.customFacName.trim() !== '') {
      textData.new_facilities = JSON.stringify([
        { name: this.customFacName.trim(), icon: '' },
      ]);
    }
    delete (textData as any).rooms;

    if (this.isEditMode()) {
      this.dormSv.updateDorm(this.dormId!, textData).subscribe({
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
        },
      });
    } else {
      this.dormSv.registerDorm(textData).subscribe({
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
        },
      });
    }
  }

  async performImageUpload(dormId: number) {
    const formData = new FormData();
    const wasInitial = !this.isEditMode();

    // Only append if file is newly selected
    if (this.images['FRONT'].file)
      formData.append('FRONT_DORM_IMG', this.images['FRONT'].file);
    if (wasInitial && this.images['LICENSE'].file)
      formData.append('LICENSE_IMG', this.images['LICENSE'].file);

    if (this.images['CEILING'].file)
      formData.append('CEILING_IMG', this.images['CEILING'].file);
    if (this.images['WALL'].file)
      formData.append('WALL_IMG', this.images['WALL'].file);
    if (this.images['FLOOR'].file)
      formData.append('FLOOR_IMG', this.images['FLOOR'].file);
    if (this.images['BED'].file)
      formData.append('BED_IMG', this.images['BED'].file);
    if (this.images['BATHROOM'].file)
      formData.append('BATHROOM_IMG', this.images['BATHROOM'].file);
    if (this.images['BALCONY'].file)
      formData.append('BALCONY_IMG', this.images['BALCONY'].file);

    const remainingGallery = this.otherImages()
      .filter((img) => img.preview && img.preview.startsWith('http'))
      .map((img) => img.preview);
    formData.append('remainingGallery', JSON.stringify(remainingGallery));

    this.otherImages().forEach((img) => {
      if (img.file) formData.append('OTHER_IMG', img.file);
    });

    if (this.customFacIcon.file) {
      formData.append('FACILITY_IMG', this.customFacIcon.file);
    }

    // Check if anything to upload
    let hasFiles = false;
    formData.forEach(() => {
      hasFiles = true;
    });

    if (!wasInitial && !hasFiles) {
      this.isLoading.set(false);
      this.navCtrl.navigateForward(`/dorm-detail/${dormId}`, {
        queryParams: { preview: 'true', isEdit: 'true' },
      });
      return;
    }

    this.dormSv
      .uploadDormImages(dormId, formData)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          if (wasInitial) {
            this.dormId = dormId;
            this.isDraftRegistration = true;
            this.isEditMode.set(true);
            this.location.replaceState(`/dorm-register/edit/${dormId}`);
          }

          this.navCtrl.navigateForward(`/dorm-detail/${dormId}`, {
            queryParams: {
              preview: 'true',
              isEdit: !wasInitial ? 'true' : undefined,
            },
          });
        },
        error: (err) => {
          console.error(err);
          const msg = wasInitial
            ? 'ลงทะเบียนสำเร็จ แต่รูปภาพบางส่วนไม่สามารถอัปโหลดได้'
            : 'อัปเดตข้อมูลสำเร็จ แต่รูปภาพบางส่วนไม่สามารถอัปโหลดได้';
          this.showToast(msg, 'warning');

          if (wasInitial) {
            this.dormId = dormId;
            this.isDraftRegistration = true;
            this.isEditMode.set(true);
          }
          this.navCtrl.navigateForward(`/dorm-detail/${dormId}`, {
            queryParams: {
              preview: 'true',
              isEdit: !wasInitial ? 'true' : undefined,
            },
          });
        },
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

  goBack() {
    this.navCtrl.back();
  }
}
