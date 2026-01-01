import { Component, OnInit, signal } from '@angular/core';
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
export class MainLayoutPage implements OnInit {
  menuSelected = signal<string | null>(null);
  constructor(private router: Router, public loadingSv: LoadingService) {}
  isOpenMenu = signal<boolean>(false);
  menuComp = signal<boolean>(false);

  openMenu() {
    this.isOpenMenu.set(true);
  }

  closeMenu() {
    this.isOpenMenu.set(false);
  }

  ngOnInit() {}

  goTo({ destination, id }: { destination: string; id: number | null }) {
    if (destination == '/') {
    }

    if (!id) {
      return this.router.navigateByUrl(`/${destination}`);
    }
    return this.router.navigateByUrl(`/${destination}/${id}`);
  }
  goHome() {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/home']);
    });
  }
}
