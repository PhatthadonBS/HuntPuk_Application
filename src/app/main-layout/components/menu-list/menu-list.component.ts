import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonGrid, IonRow, IonCol, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  listOutline,
  personOutline,
  clipboardOutline,
  businessOutline,
  heartOutline,
  peopleOutline,
  documentTextOutline,
  statsChartOutline,
  keyOutline,
  chevronDownOutline,
  closeOutline,
  readerOutline,
  cubeOutline,
  idCardOutline,
} from 'ionicons/icons';
import { AuthenService } from 'src/app/services/authenService';
import { Subscription } from 'rxjs';
import { Gesture, GestureController, GestureDetail } from '@ionic/angular';

@Component({
  selector: 'app-menu-list',
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.scss'],
  standalone: true,
  imports: [IonCol, IonRow, IonGrid, IonIcon, CommonModule],
})
export class MenuListComponent implements OnDestroy, AfterViewInit {
  @Output() selectMenu = new EventEmitter<{
    destination: string;
    id: number | null;
  }>();
  @Output() close = new EventEmitter<void>();

  @ViewChild('menuWrapper', { static: false }) menuWrapper!: ElementRef;
  @ViewChild('menuOverlay', { static: false }) menuOverlay!: ElementRef;
  @ViewChild('dragHandle', { static: false }) dragHandle!: ElementRef;

  selected = signal<string | null>(null);
  user_id = signal<number | null>(null);
  isLogIn = signal<boolean>(false);
  inRole = signal<number>(0);
  isClosing = signal<boolean>(false);

  private authSub: Subscription;
  private gesture?: Gesture;

  filterMenu = computed(() => {
    const isLogin = this.isLogIn();
    const role = this.inRole();
    const uid = this.user_id();

    const menus = [
      {
        key: 'home',
        label: 'หน้าหลัก',
        path: '/home',
        icon: 'home-outline',
        always: true,
        forRole: [0, 1, 2, 3],
      },
      {
        key: 'dorms',
        label: 'รายการ',
        path: '/dorms',
        icon: 'list-outline',
        always: true,
        forRole: [0, 1, 2, 3],
      },
      {
        key: 'profile',
        label: 'บัญชีของฉัน',
        path: '/profile',
        icon: 'person-outline',
        needsId: true,
        neddLogin: true,
        forRole: [1, 2, 3],
      },
      {
        key: 'register',
        label: 'สมัครสมาชิก',
        path: '/register',
        icon: 'reader-outline',
        neddLogin: false,
        forRole: [0],
      },
      {
        key: 'dorm-reg',
        label: 'ลงทะเบียนหอพัก',
        path: '/dorm-register',
        icon: 'clipboard-outline',
        needsId: true,
        neddLogin: true,
        forRole: [2, 3],
      },
      {
        key: 'dorm-manage',
        label: `${role == 3 ? 'จัดการหอพัก' : 'หอพักของฉัน'}`,
        path: '/my-dorm',
        icon: 'business-outline',
        needsId: true,
        neddLogin: true,
        forRole: [2, 3],
      },
      {
        key: 'my-favorites',
        label: 'รายการโปรด',
        path: '/my-favorites',
        icon: 'heart-outline',
        needsId: true,
        neddLogin: true,
        forRole: [1, 2, 3],
      },
      {
        key: 'request-owner',
        label: 'ขอสิทธิ์เจ้าของหอ',
        path: '/owner-register',
        icon: 'key-outline',
        needsId: true,
        neddLogin: true,
        forRole: [1],
      },
      // Admin Only Menus

      {
        key: 'owner-manage',
        label: 'คำร้องขอเป็นเจ้าของหอ',
        path: '/owner-requests',
        icon: 'id-card-outline',
        neddLogin: true,
        forRole: [3],
      },
      {
        key: 'member-manage',
        label: 'จัดการสมาชิก',
        path: '/member-management',
        icon: 'people-outline',
        neddLogin: true,
        forRole: [3],
      },
      {
        key: 'facility-manage',
        label: 'สิ่งอำนวยความสะดวก',
        path: '/facility-management',
        icon: 'cube-outline',
        neddLogin: true,
        forRole: [3],
      },
      {
        key: 'type-manage',
        label: 'จัดการประเภท',
        path: '/type-management',
        icon: 'cube-outline',
        neddLogin: true,
        forRole: [3],
      },
      {
        key: 'dashboard',
        label: 'แดชบอร์ด',
        path: '/dashboard',
        icon: 'stats-chart-outline',
        neddLogin: true,
        forRole: [3],
      },
    ];

    return menus.filter((menu) => {
      if (menu.always) return true;
      if (menu.neddLogin === true && !isLogin) return false;
      if (menu.neddLogin === false && isLogin) return false;
      if (menu.forRole && !menu.forRole.includes(role)) return false;
      return true;
    });
  });

  constructor(
    private authSv: AuthenService,
    private gestureCtrl: GestureController
  ) {
    addIcons({
      homeOutline,
      listOutline,
      personOutline,
      clipboardOutline,
      businessOutline,
      heartOutline,
      peopleOutline,
      documentTextOutline,
      statsChartOutline,
      keyOutline,
      chevronDownOutline,
      closeOutline,
      readerOutline,
      cubeOutline,
      idCardOutline,
    });

    this.authSub = this.authSv.user$.subscribe({
      next: (u) => {
        if (u) {
          this.user_id.set(u.id);
          this.inRole.set(u.role);
          this.isLogIn.set(true);
        } else {
          this.user_id.set(null);
          this.inRole.set(0);
          this.isLogIn.set(false);
        }
      },
    });
  }

  ngAfterViewInit() {
    this.initGesture();
  }

  private initGesture() {
    if (!this.dragHandle || !this.menuWrapper) return;

    this.gesture = this.gestureCtrl.create({
      el: this.dragHandle.nativeElement,
      gestureName: 'swipe-down-to-close',
      direction: 'y',
      onMove: (detail) => this.onMove(detail),
      onEnd: (detail) => this.onEnd(detail),
    });

    this.gesture.enable();
  }

  private onMove(detail: GestureDetail) {
    // Only allow dragging downwards
    if (detail.deltaY > 0) {
      // Temporarily remove transition so it tracks the finger instantly
      this.menuWrapper.nativeElement.style.transition = 'none';
      this.menuWrapper.nativeElement.style.transform = `translateY(${detail.deltaY}px)`;
    }
  }

  private onEnd(detail: GestureDetail) {
    // Re-enable smooth transition for the snap-back or close
    this.menuWrapper.nativeElement.style.transition =
      'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';

    // If dragged down more than 100px OR swiped fast downwards, close it
    if (detail.deltaY > 100 || detail.velocityY > 0.5) {
      this.slideDownAndClose();
    } else {
      // Otherwise, snap back to the original position
      this.menuWrapper.nativeElement.style.transform = 'translateY(0)';
    }
  }

  onSelect(menuKey: string, needsId: boolean, path: string) {
    let finalPath = path;
    if (menuKey === 'profile' && this.inRole() === 2) {
      finalPath = '/owner-profile';
    }

    const destination = {
      destination: finalPath,
      id: needsId ? this.user_id() : null,
    };

    if (this.isClosing()) return;
    this.isClosing.set(true);

    if (this.menuWrapper && this.menuOverlay) {
      // Close animation
      this.menuWrapper.nativeElement.style.transition =
        'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
      this.menuWrapper.nativeElement.style.transform = 'translateY(100%)';
      this.menuOverlay.nativeElement.style.animation =
        'quickFadeOut 0.25s ease-out forwards';

      setTimeout(() => {
        // Emit selection and THEN tell parent to close (destroying this component)
        this.selectMenu.emit(destination);
        this.close.emit();
        this.isClosing.set(false);
      }, 250);
    } else {
      this.selectMenu.emit(destination);
      this.close.emit();
      this.isClosing.set(false);
    }
  }

  closeMenu() {
    this.slideDownAndClose();
  }

  slideDownAndClose() {
    if (this.isClosing()) return;
    this.isClosing.set(true);

    if (this.menuWrapper && this.menuOverlay) {
      // Force transition to ensure smooth exit
      this.menuWrapper.nativeElement.style.transition =
        'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
      this.menuWrapper.nativeElement.style.transform = 'translateY(100%)';
      this.menuOverlay.nativeElement.style.animation =
        'quickFadeOut 0.25s ease-out forwards';

      setTimeout(() => {
        this.close.emit();
        this.isClosing.set(false);
      }, 250);
    } else {
      this.close.emit();
      this.isClosing.set(false);
    }
  }

  ngOnDestroy() {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
    if (this.gesture) {
      this.gesture.destroy();
    }
  }
}
