import {
  Component,
  EventEmitter,
  Output,
  signal,
  computed,
  OnDestroy,
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
} from 'ionicons/icons';
import { AuthenService } from 'src/app/services/authenService';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-menu-list',
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.scss'],
  standalone: true,
  imports: [IonCol, IonRow, IonGrid, IonIcon, CommonModule],
})
export class MenuListComponent implements OnDestroy {
  @Output() selectMenu = new EventEmitter<{
    destination: string;
    id: number | null;
  }>();
  @Output() close = new EventEmitter<void>();

  selected = signal<string | null>(null);

  // เปลี่ยนตัวแปร State ให้เป็น Signal ให้หมด
  user_id = signal<number | null>(null);
  isLogIn = signal<boolean>(false);
  inRole = signal<number>(0);

  // ตัวแปรสำหรับเก็บ Subscription เพื่อใช้ทำลายตอนปิดเมนู
  private authSub: Subscription;

  // 🚀 ใช้ Computed Signal จำค่า Array ไว้ ป้องกัน Angular สร้างปุ่มใหม่รัวๆ
  filterMenu = computed(() => {
    const isLogin = this.isLogIn();
    const role = this.inRole();
    const uid = this.user_id();

    const menus = [
      {
        key: 'home',
        label: 'หน้าหลัก',
        icon: 'home-outline',
        always: true,
        forRole: [0, 1, 2, 3],
      },
      {
        key: 'dorms',
        label: 'รายการ',
        icon: 'list-outline',
        always: true,
        forRole: [0, 1, 2, 3],
      },
      {
        key: 'profile',
        label: 'บัญชีของฉัน',
        icon: 'person-outline',
        user_id: uid,
        neddLogin: true,
        forRole: [1, 2, 3],
      },
      {
        key: 'register',
        label: 'สมัครสมาชิก',
        icon: 'reader-outline',
        neddLogin: false,
        forRole: [0],
      },
      {
        key: 'dorm-reg',
        label: 'ลงทะเบียนหอพัก',
        icon: 'clipboard-outline',
        neddLogin: true,
        forRole: [2, 3],
      },
      {
        key: 'dorm-manage',
        label: 'จัดการหอพัก',
        icon: 'business-outline',
        neddLogin: true,
        forRole: [2, 3],
      },
      {
        key: 'favorite',
        label: 'รายการโปรด',
        icon: 'heart-outline',
        neddLogin: true,
        forRole: [1, 2, 3],
      },
      {
        key: 'request-owner',
        label: 'ร้องขอสิทธิ์เจ้าของหอ',
        icon: 'key-outline',
        neddLogin: true,
        forRole: [1],
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

  constructor(private authSv: AuthenService) {
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
    });

    // สมัครรับข้อมูลจาก BehaviorSubject และเก็บใส่ this.authSub
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

  onSelect(menuKey: string, uid: number | null) {
    // อ่านค่า Signal ด้วยการใส่วงเล็บ this.user_id()
    this.selectMenu.emit({ destination: menuKey, id: uid ?? this.user_id() });
    this.closeMenu();
  }

  closeMenu() {
    this.close.emit();
  }

  // 🧹 คืนพื้นที่หน่วยความจำเมื่อ Component ถูกปิด
  ngOnDestroy() {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }
}
