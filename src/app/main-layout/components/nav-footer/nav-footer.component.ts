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
  logInOutline,
} from 'ionicons/icons';
import { IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { AuthenService } from 'src/app/services/authenService';
import { filter } from 'rxjs';

@Component({
  selector: 'app-nav-footer',
  templateUrl: './nav-footer.component.html',
  styleUrls: ['./nav-footer.component.scss'],
  standalone: true,
  imports: [IonIcon, CommonModule],
})
export class NavFooterComponent implements OnInit {
  isLoggedIn = signal<boolean>(false);
  userId = signal<number | null>(null);
  currentPath = signal<string>('');
  
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
      logInOutline,
    });

    this.currentPath.set(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentPath.set(event.urlAfterRedirects);
    });

    this.authSv.user$.subscribe((u) => {
      if (u && (u.logged_in == true)) {
        this.userId.set(u.user.id);
        this.isLoggedIn.set(true);
      } else {
        this.isLoggedIn.set(false);
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
