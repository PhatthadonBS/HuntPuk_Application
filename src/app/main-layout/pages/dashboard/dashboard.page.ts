import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonSkeletonText,
  IonModal,
  IonButton,
} from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  peopleOutline,
  personOutline,
  starOutline,
  eyeOutline,
  locationOutline,
  globeOutline,
  close,
  checkmarkCircleOutline,
  powerOutline,
  banOutline,
} from 'ionicons/icons';
import { environment } from 'src/environments/environment';
import { NavController } from '@ionic/angular/standalone';

import { Chart, registerables } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, ChartDataLabels);

interface ZoneBreakdown {
  zoneId: number;
  zoneName: string;
  dormCount: number;
}

interface DormStatusBreakdown {
  statusName: string;
  count: number;
}

interface DormTypeBreakdown {
  typeName: string;
  count: number;
}

interface UserStatusBreakdown {
  activeUsers: number;
  deactiveUsers: number;
  bannedUsers: number;
}

interface ViewsPerMonthBreakdown {
  year: number;
  month: number;
  count: number;
}

interface TopPopularDorm {
  dormId: number;
  dormName: string;
  views: number;
}

interface DashboardStats {
  dormCount: number;
  memberCount: number;
  ownerCount: number;
  zoneCount: number;
  totalWebsiteViews: number;
  popularDormName: string;
  popularDormViews: number;
  topPopularDorms: TopPopularDorm[];
  zoneBreakdown: ZoneBreakdown[];
  dormStatusBreakdown: DormStatusBreakdown[];
  dormTypeBreakdown: DormTypeBreakdown[];
  userStatusBreakdown: UserStatusBreakdown;
  viewsPerMonthBreakdown: ViewsPerMonthBreakdown[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonSkeletonText,
    CommonModule,
    FormsModule,
  ],
})
export class DashboardPage implements OnInit {
  private http = inject(HttpClient);
  private navCtrl = inject(NavController);
  
  @ViewChild('dormStatusCanvas') dormStatusCanvas!: ElementRef;
  @ViewChild('dormTypeCanvas') dormTypeCanvas!: ElementRef;
  @ViewChild('viewCanvas') viewCanvas!: ElementRef;

  stats: DashboardStats | null = null;
  isLoading = true;
  error = false;
  
  isDormModalOpen = false;
  isUserModalOpen = false;
  isZoneModalOpen = false;
  isViewModalOpen = false;
  isPopularModalOpen = false;

  selectedYearForTable: number | null = null;
  private charts: Chart[] = [];

  constructor() {
    addIcons({
      businessOutline,
      peopleOutline,
      personOutline,
      starOutline,
      eyeOutline,
      locationOutline,
      globeOutline,
      close,
      checkmarkCircleOutline,
      powerOutline,
      banOutline,
    });
  }

  ngOnInit() {
    this.fetchStats();
  }

  // --- Modal Controls ---
  openDormModal() { 
    this.isDormModalOpen = true; 
    setTimeout(() => this.renderDormCharts(), 100);
  }
  closeDormModal() { this.isDormModalOpen = false; this.destroyCharts(); }

  openUserModal() { this.isUserModalOpen = true; }
  closeUserModal() { this.isUserModalOpen = false; }

  openZoneModal() { this.isZoneModalOpen = true; }
  closeZoneModal() { this.isZoneModalOpen = false; }

  openViewModal() { 
    this.isViewModalOpen = true; 
    this.selectedYearForTable = null;
    setTimeout(() => this.renderViewChart(), 100);
  }
  closeViewModal() { this.isViewModalOpen = false; this.destroyCharts(); }

  openPopularModal() { this.isPopularModalOpen = true; }
  closePopularModal() { this.isPopularModalOpen = false; }

  goToFilteredDorms(zoneId: number) {
    this.closeZoneModal();
    this.navCtrl.navigateForward('/dorms', { queryParams: { zone: zoneId } });
  }

  goToDormDetail(dormId: number) {
    this.closePopularModal();
    this.navCtrl.navigateForward(`/dorm-detail/${dormId}`);
  }

  private destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  // --- Chart Rendering Methods ---
  renderDormCharts() {
    if (!this.stats || !this.dormStatusCanvas || !this.dormTypeCanvas) return;
    
    const statusCtx = this.dormStatusCanvas.nativeElement;
    const statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: this.stats.dormStatusBreakdown.map(d => d.statusName),
        datasets: [{
          data: this.stats.dormStatusBreakdown.map(d => d.count),
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'],
        }]
      },
      options: { 
        responsive: true, 
        plugins: { 
          legend: { position: 'bottom' },
          datalabels: {
            color: '#fff',
            font: { weight: 'bold', size: 14 },
            formatter: (value) => value > 0 ? value : ''
          }
        } 
      }
    });

    const typeCtx = this.dormTypeCanvas.nativeElement;
    const typeChart = new Chart(typeCtx, {
      type: 'doughnut',
      data: {
        labels: this.stats.dormTypeBreakdown.map(d => d.typeName),
        datasets: [{
          data: this.stats.dormTypeBreakdown.map(d => d.count),
          backgroundColor: ['#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
        }]
      },
      options: { 
        responsive: true, 
        plugins: { 
          legend: { position: 'bottom' },
          datalabels: {
            color: '#fff',
            font: { weight: 'bold', size: 14 },
            formatter: (value) => value > 0 ? value : ''
          }
        } 
      }
    });

    this.charts.push(statusChart, typeChart);
  }

  renderViewChart() {
    if (!this.stats || !this.viewCanvas) return;
    
    // Group views by year
    const yearMap = new Map<number, number>();
    this.stats.viewsPerMonthBreakdown.forEach(v => {
      const current = yearMap.get(v.year) || 0;
      yearMap.set(v.year, current + v.count);
    });

    const labels = Array.from(yearMap.keys()).sort();
    const data = labels.map(year => yearMap.get(year));

    const ctx = this.viewCanvas.nativeElement;
    const viewChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.map(y => y.toString()),
        datasets: [{
          label: 'Yearly Views',
          data: data as number[],
          backgroundColor: ['#0ea5e9', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444'],
        }]
      },
      options: { 
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        onClick: (event, elements, chart) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const clickedYear = labels[index];
            this.selectedYearForTable = clickedYear;
          }
        }
      }
    });
    this.charts.push(viewChart);
  }

  // --- Table Data Helpers ---
  getMonthlyTableData() {
    if (!this.stats || !this.selectedYearForTable) return [];
    return this.stats.viewsPerMonthBreakdown.filter(v => v.year === this.selectedYearForTable);
  }

  getMonthName(monthNumber: number): string {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('default', { month: 'long' });
  }

  fetchStats() {
    this.isLoading = true;
    this.error = false;
    this.http
      .get<{ success: boolean; data: DashboardStats }>(
        `${environment.ENDPOINT}/dashboard/stats`
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.stats = res.data;
          } else {
            this.error = true;
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching dashboard stats', err);
          this.error = true;
          this.isLoading = false;
        },
      });
  }
}
