import { Component, Input } from '@angular/core';
import { AdminDashboardCard } from '../../interfaces/admin.interfaces';

@Component({
  selector: 'app-stats-card',
  template: `
    <mat-card class="stats-card" 
              [ngClass]="'color-' + card.color"
              [attr.aria-labelledby]="cardId + '-title'"
              [attr.aria-describedby]="cardId + '-description'"
              role="article"
              tabindex="0"
              (keydown.enter)="onCardActivate($event)"
              (keydown.space)="onCardActivate($event)"
              (click)="onCardClick()">
      <mat-card-content>
        <div class="stats-header">
          <div class="stats-icon" [attr.aria-hidden]="true">
            <mat-icon [ngClass]="'icon-' + card.color" aria-hidden="true">{{ card.icon }}</mat-icon>
          </div>
          <div class="stats-trend" 
               *ngIf="card.trend"
               [attr.aria-label]="getTrendAriaLabel()">
            <mat-icon 
              [ngClass]="'trend-' + card.trend.direction"
              [matTooltip]="card.trend.percentage + '% ' + card.trend.direction + ' from ' + card.trend.period"
              aria-hidden="true">
              {{ getTrendIcon(card.trend.direction) }}
            </mat-icon>
            <span class="trend-percentage" 
                  [ngClass]="'trend-' + card.trend.direction"
                  [attr.aria-label]="card.trend.percentage + ' percent ' + card.trend.direction">
              {{ card.trend.percentage }}%
            </span>
          </div>
        </div>
        
        <div class="stats-content">
          <div class="stats-value" 
               [attr.aria-label]="getValueAriaLabel()">
            {{ formatValue(card.value) }}
          </div>
          <div class="stats-title" [id]="cardId + '-title'">{{ card.title }}</div>
        </div>
        
        <!-- Hidden description for screen readers -->
        <div [id]="cardId + '-description'" class="sr-only">
          {{ getCardDescription() }}
        </div>
        
        <div class="stats-action" *ngIf="card.link">
          <button mat-button 
                  class="view-details-btn" 
                  (click)="onViewDetails($event)"
                  [attr.aria-label]="'View details for ' + card.title">
            View Details
            <mat-icon aria-hidden="true">arrow_forward</mat-icon>
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

    // Accessibility styles
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .stats-card:focus {
      outline: 2px solid #1976d2;
      outline-offset: 2px;
    }

    @media (prefers-color-scheme: dark) {
      .stats-card:focus {
        outline-color: #64b5f6;
      }
    }
  `]
})
export class StatsCardComponent {
  @Input() card!: AdminDashboardCard;
  
  get cardId(): string {
    return this.card.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

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

  // Accessibility methods
  getTrendAriaLabel(): string {
    if (!this.card.trend) {
      return '';
    }
    const direction = this.card.trend.direction === 'up' ? 'increased' : 
                     this.card.trend.direction === 'down' ? 'decreased' : 
                     'remained stable';
    return `Trend: ${direction} by ${this.card.trend.percentage}% from ${this.card.trend.period}`;
  }

  getValueAriaLabel(): string {
    const formattedValue = this.formatValue(this.card.value);
    return `Current value: ${formattedValue}`;
  }

  getCardDescription(): string {
    let description = `${this.card.title}: ${this.formatValue(this.card.value)}`;
    
    if (this.card.trend) {
      const direction = this.card.trend.direction === 'up' ? 'increased' : 
                       this.card.trend.direction === 'down' ? 'decreased' : 
                       'remained stable';
      description += `. ${direction} by ${this.card.trend.percentage}% from ${this.card.trend.period}`;
    }
    
    if (this.card.link) {
      description += '. Press Enter or Space to view details.';
    }
    
    return description;
  }

  // Interaction methods
  onCardActivate(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.card.link) {
      this.onViewDetails(event);
    }
  }

  onCardClick(): void {
    if (this.card.link) {
      this.onViewDetails();
    }
  }

  onViewDetails(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (this.card.link) {
      // Navigate to the link - this would be handled by a router service
      console.log('Navigate to:', this.card.link);
    }
  }
}