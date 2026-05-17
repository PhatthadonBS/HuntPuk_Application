import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  grid,
  gridOutline,
  home,
  homeOutline,
  list,
  personAdd,
  personCircleOutline,
} from 'ionicons/icons';
import { IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthenService } from 'src/app/services/authenService';
import { UserDataGetRes, UserLoggedInPostRes } from 'src/app/model/user.model';
import { MenuListComponent } from '../menu-list/menu-list.component';

@Component({
  selector: 'app-nav-footer',
  templateUrl: './nav-footer.component.html',
  styleUrls: ['./nav-footer.component.scss'],
  standalone: true,
  imports: [IonIcon, CommonModule],
})
export class NavFooterComponent implements OnInit {
  isLoggedIn = signal<boolean>(false);
  userId = signal<number | null>(null)
  @Output() menuClick = new EventEmitter<void>();
  @Output() homeClick = new EventEmitter<{destination: string, id: null}>();
  @Output() loginClick = new EventEmitter<{destination: string, id: null}>();
  @Output() accountClick = new EventEmitter<{destination: string, id: number | null}>();

  constructor(private authSv: AuthenService, private router: Router) {
    addIcons({
      list,
      personAdd,
      homeOutline,
      home,
      gridOutline,
      personCircleOutline,
    });
    this.authSv.user$.subscribe((u) => {
      if (u &&(u.logged_in == true)) {
        this.userId.set(u.user.id)
        this.isLoggedIn.set(true);
      }else{
        this.isLoggedIn.set(false)
      }
    });
  }

  ngOnInit() {}

  onMenuClick() {
    this.menuClick.emit();
  }

  onLoginClick() {
    this.loginClick.emit({destination: "login", id: null});
  }

  onAccountClick() {
    this.accountClick.emit({destination: "profile", id: this.userId()});
  }

  onHomeClick() {
    this.homeClick.emit({destination: "", id: null});
  }
}
