import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonApp,
  IonRouterOutlet,
} from '@ionic/angular/standalone';
import { NavFooterComponent } from './components/nav-footer/nav-footer.component';
import { Router } from '@angular/router';
import { MenuListComponent } from './components/menu-list/menu-list.component';
import { LoadingUIComponent } from './components/loading-ui/loading-ui.component';
import { LoadingService } from '../services/loading-service';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.page.html',
  styleUrls: ['./main-layout.page.scss'],
  standalone: true,
  imports: [
    IonRouterOutlet,
    IonContent,
    CommonModule,
    FormsModule,
    NavFooterComponent,
    MenuListComponent,
  ],
})
export class MainLayoutPage implements OnInit, OnDestroy {
  menuSelected = signal<string | null>(null);
  constructor(
    private router: Router,
    public loadingSv: LoadingService,
    private navCtrl: NavController
  ) {}
  isOpenMenu = signal<boolean>(false);
  hideFooter = signal<boolean>(false); // New signal to hide footer
  menuComp = signal<boolean>(false);

  openMenu() {
    this.isOpenMenu.set(true);
  }

  closeMenu() {
    this.isOpenMenu.set(false);
  }

  ngOnInit() {}

  ngOnDestroy() {
    // Explicitly close menu on destroy to prevent lingering overlays
    this.closeMenu();
  }

  goTo({ destination, id }: { destination: string; id?: number | null }) {
    if (destination === 'home' || destination === '/') {
      return this.goHome();
    }

    if (id == null) {
      return this.router.navigate([`/${destination}`]);
    }

    return this.router.navigate([`/${destination}`, id]);
  }

  goHome() {
    return this.navCtrl.navigateRoot('/home');
  }
}
