import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.scss']
})
export class SplashScreenComponent implements OnInit {
  isVisible = signal<boolean>(true);

  ngOnInit() {
    // Keep splash screen for 2 seconds
    setTimeout(() => {
      this.isVisible.set(false);
    }, 2000);
  }
}
