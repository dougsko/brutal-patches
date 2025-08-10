import { Component, Input } from '@angular/core';
import { AdminDashboardCard } from '../../interfaces/admin.interfaces';

@Component({
  selector: 'app-stats-card',
  template: `
    <mat-card class="stats-card" [ngClass]="'color-' + card.color">
      <mat-card-content>
        <div class="stats-header">
          <div class="stats-icon">
            <mat-icon [ngClass]="'icon-' + card.color">{{ card.icon }}</mat-icon>
          </div>
          <div class="stats-trend" *ngIf="card.trend">
            <mat-icon 
              [ngClass]="'trend-' + card.trend.direction"
              [matTooltip]="card.trend.percentage + '% ' + card.trend.direction + ' from ' + card.trend.period">
              {{ getTrendIcon(card.trend.direction) }}
            </mat-icon>
            <span class="trend-percentage" [ngClass]="'trend-' + card.trend.direction">
              {{ card.trend.percentage }}%
            </span>
          </div>
        </div>
        
        <div class="stats-content">
          <div class="stats-value">{{ formatValue(card.value) }}</div>
          <div class="stats-title">{{ card.title }}</div>
        </div>
        
        <div class="stats-action" *ngIf="card.link">
          <button mat-button class="view-details-btn" (click)="onViewDetails()">
            View Details
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .stats-card {
      height: 100%;
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    }

    .stats-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .stats-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: currentColor;
    }

    .color-primary::before { background: #1976d2; }
    .color-accent::before { background: #388e3c; }
    .color-warn::before { background: #d32f2f; }

    .stats-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .stats-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.04);
    }

    .icon-primary { color: #1976d2; }
    .icon-accent { color: #388e3c; }
    .icon-warn { color: #d32f2f; }

    .stats-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .stats-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .trend-up {
      color: #388e3c;
    }

    .trend-down {
      color: #d32f2f;
    }

    .trend-neutral {
      color: #ff9800;
    }

    .trend-percentage {
      font-weight: 600;
    }

    .stats-content {
      margin-bottom: 16px;
    }

    .stats-value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .stats-title {
      font-size: 0.875rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .stats-action {
      margin-top: auto;
    }

    .view-details-btn {
      font-size: 12px;
      padding: 0;
      min-width: auto;
      color: #1976d2;
    }

    .view-details-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-left: 4px;
    }

    mat-card-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 20px;
    }
  `]
})
export class StatsCardComponent {
  @Input() card!: AdminDashboardCard;

  getTrendIcon(direction: 'up' | 'down' | 'neutral'): string {
    switch (direction) {
      case 'up':
        return 'trending_up';
      case 'down':
        return 'trending_down';
      case 'neutral':
      default:
        return 'trending_flat';
    }
  }

  formatValue(value: string | number): string {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      }
      return value.toLocaleString();
    }
    return value;
  }

  onViewDetails(): void {
    if (this.card.link) {
      // Navigate to the link - this would be handled by a router service
      console.log('Navigate to:', this.card.link);
    }
  }
}