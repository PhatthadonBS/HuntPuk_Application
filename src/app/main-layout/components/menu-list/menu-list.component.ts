import { Component, EventEmitter, Output, signal } from '@angular/core';
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
import { UserLoggedInPostRes } from 'src/app/model/user.model';

@Component({
  selector: 'app-menu-list',
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.scss'],
  standalone: true,
  imports: [IonCol, IonRow, IonGrid, IonIcon, CommonModule],
})
export class MenuListComponent {
  @Output() selectMenu = new EventEmitter<{
    destination: string;
    id: number | null;
  }>();
  @Output() close = new EventEmitter<void>();
  selected = signal<string | null>(null);
  localData = localStorage.getItem('user');
  user_id: number | null = null;

  isLogIn = signal<boolean>(false);
  inRole = signal<number>(0);
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

    authSv.user$.subscribe({
      next: (u) => {
        if (u) {
          this.user_id = u.user.id;
          this.inRole.set(u.user.role_id);
          this.isLogIn.set(true);
        }
      },
    });
  }

  menus = [
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
      user_id: this.user_id,
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

  onSelect(menuKey: string, uid: number | null) {
    if (uid) {
      return this.selectMenu.emit({ destination: menuKey, id: uid });
    }
    return this.selectMenu.emit({ destination: menuKey, id: null });
  }

  closeMenu() {
    this.close.emit();
  }

get filterMenu() {
  const isLogin = this.isLogIn();
  const role = this.inRole();

  return this.menus.filter(menu => {

    // 1️⃣ always show
    if (menu.always) return true;

    // 2️⃣ login condition
    if (menu.neddLogin === true && !isLogin) return false;
    if (menu.neddLogin === false && isLogin) return false;

    // 3️⃣ role condition
    if (menu.forRole && !menu.forRole.includes(role)) return false;

    return true;
  });
}

}
