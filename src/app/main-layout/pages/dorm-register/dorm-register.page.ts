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
      water_lump: [null, [Validators.required, Validators.min(0)]],
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

    if (this.isEditMode()) {
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
            if (d.bathroom_img)
              this.images['BATHROOM'].preview = d.bathroom_img;
            if (d.balcony_img) this.images['BALCONY'].preview = d.balcony_img;

            if (d.gallery && d.gallery.length > 0) {
              const validGallery = d.gallery.filter(
                (url: string) => url && url.trim() !== ''
              );
              this.otherImages.set(
                validGallery.map((url: string) => ({
                  file: null,
                  preview: url,
                }))
              );
            }
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
      if (isOther && index === -1) {
        // Multi-select for "Other" images
        const currentCount = this.otherImages().length;
        if (currentCount >= 5) {
          this.showToast('อัปโหลดรูปภาพอื่นๆ ได้สูงสุด 5 รูป', 'warning');
          return;
        }

        const result = await Camera.pickImages({
          quality: 90,
          limit: 5 - currentCount,
        });

        if (result.photos.length > 0) {
          for (const photo of result.photos) {
            const dataUrl = await this.getBase64FromPath(photo.webPath);
            const file = await this.dataUrlToFile(
              dataUrl,
              `other_${Date.now()}.webp`
            );
            this.otherImages.update((imgs) => [
              ...imgs,
              { file, preview: dataUrl },
            ]);
          }
        }
        this.cdr.detectChanges();
        return;
      }

      // Single select for specific slots or replacement
      const actionSheet = await this.actionSheetCtrl.create({
        mode: 'md',
        cssClass: 'minimal-action-sheet',
        buttons: [
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
          {
            text: 'ยกเลิก',
            role: 'cancel',
          },
        ],
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
      current.splice(index, 1);
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
      clickable: false,
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

    const alert = await this.alertCtrl.create({
      header: this.isEditMode() ? 'ยืนยันการแก้ไข?' : 'ยืนยันการลงทะเบียน?',
      message: this.isEditMode()
        ? 'คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลหอพักใช่หรือไม่?'
        : 'คุณต้องการส่งข้อมูลลงทะเบียนหอพักใช่หรือไม่?',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ยืนยัน',
          handler: () => this.executeSubmission(),
        },
      ],
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
    if (this.images['BATHROOM'].file)
      formData.append('BATHROOM_IMG', this.images['BATHROOM'].file);
    if (this.images['BALCONY'].file)
      formData.append('BALCONY_IMG', this.images['BALCONY'].file);

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
      this.showToast('บันทึกข้อมูลเรียบร้อยแล้ว', 'success');

      this.navCtrl.navigateForward(`/dorm-detail/${dormId}`, {
        queryParams: { preview: 'true' },
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

          this.showToast(
            wasInitial ? 'ลงทะเบียนสำเร็จ' : 'อัปเดตข้อมูลสำเร็จ',
            'success'
          );

          this.navCtrl.navigateForward(`/dorm-detail/${dormId}`, {
            queryParams: { preview: 'true' },
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
            queryParams: { preview: 'true' },
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
