import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { StatsCardComponent } from './stats-card.component';
import { AdminDashboardCard } from '../../interfaces/admin.interfaces';

describe('StatsCardComponent', () => {
  let component: StatsCardComponent;
  let fixture: ComponentFixture<StatsCardComponent>;

  const mockCard: AdminDashboardCard = {
    title: 'Total Users',
    value: 1250,
    icon: 'people',
    color: 'primary',
    trend: {
      direction: 'up',
      percentage: 12.5,
      period: 'last 30 days'
    },
    link: '/admin/users'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatsCardComponent],
      imports: [
        NoopAnimationsModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StatsCardComponent);
    component = fixture.componentInstance;
    component.card = mockCard;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display card title correctly', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const titleElement = compiled.querySelector('.stats-title');
    expect(titleElement.textContent.trim()).toBe('TOTAL USERS');
  });

  it('should display formatted value correctly', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const valueElement = compiled.querySelector('.stats-value');
    expect(valueElement.textContent.trim()).toBe('1,250');
  });

  it('should display icon correctly', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const iconElement = compiled.querySelector('.stats-icon mat-icon');
    expect(iconElement.textContent.trim()).toBe('people');
  });

  it('should display trend information when available', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const trendElement = compiled.querySelector('.trend-percentage');
    expect(trendElement.textContent.trim()).toBe('12.5%');
  });

  it('should not display trend information when not available', () => {
    component.card = { ...mockCard, trend: undefined };
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const trendElement = compiled.querySelector('.stats-trend');
    expect(trendElement).toBeFalsy();
  });

  it('should display view details button when link is provided', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const buttonElement = compiled.querySelector('.view-details-btn');
    expect(buttonElement).toBeTruthy();
    expect(buttonElement.textContent).toContain('View Details');
  });

  it('should not display view details button when link is not provided', () => {
    component.card = { ...mockCard, link: undefined };
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const buttonElement = compiled.querySelector('.view-details-btn');
    expect(buttonElement).toBeFalsy();
  });

  it('should get correct trend icon for up direction', () => {
    expect(component.getTrendIcon('up')).toBe('trending_up');
  });

  it('should get correct trend icon for down direction', () => {
    expect(component.getTrendIcon('down')).toBe('trending_down');
  });

  it('should get correct trend icon for neutral direction', () => {
    expect(component.getTrendIcon('neutral')).toBe('trending_flat');
  });

  it('should format large numbers correctly', () => {
    expect(component.formatValue(1500)).toBe('1.5K');
    expect(component.formatValue(2500000)).toBe('2.5M');
    expect(component.formatValue(500)).toBe('500');
    expect(component.formatValue(1000)).toBe('1.0K');
    expect(component.formatValue(1000000)).toBe('1.0M');
  });

  it('should format string values correctly', () => {
    expect(component.formatValue('Active')).toBe('Active');
    expect(component.formatValue('4.5')).toBe('4.5');
  });

  it('should handle view details click', () => {
    spyOn(console, 'log');
    
    component.onViewDetails();
    
    expect(console.log).toHaveBeenCalledWith('Navigate to:', '/admin/users');
  });

  it('should not call console.log when no link is provided', () => {
    component.card = { ...mockCard, link: undefined };
    spyOn(console, 'log');
    
    component.onViewDetails();
    
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should apply correct color class', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const cardElement = compiled.querySelector('.stats-card');
    expect(cardElement.classList.contains('color-primary')).toBeTruthy();
  });

  it('should display correct trend icon for up trend', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const trendIcon = compiled.querySelector('.stats-trend mat-icon');
    expect(trendIcon.textContent.trim()).toBe('trending_up');
  });

  it('should display correct trend icon for down trend', () => {
    component.card = {
      ...mockCard,
      trend: {
        direction: 'down',
        percentage: 5.2,
        period: 'last week'
      }
    };
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const trendIcon = compiled.querySelector('.stats-trend mat-icon');
    expect(trendIcon.textContent.trim()).toBe('trending_down');
  });

  it('should apply correct trend class for up trend', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const trendIcon = compiled.querySelector('.stats-trend mat-icon');
    const trendText = compiled.querySelector('.trend-percentage');
    expect(trendIcon.classList.contains('trend-up')).toBeTruthy();
    expect(trendText.classList.contains('trend-up')).toBeTruthy();
  });

  it('should apply correct trend class for down trend', () => {
    component.card = {
      ...mockCard,
      trend: {
        direction: 'down',
        percentage: 5.2,
        period: 'last week'
      }
    };
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const trendIcon = compiled.querySelector('.stats-trend mat-icon');
    const trendText = compiled.querySelector('.trend-percentage');
    expect(trendIcon.classList.contains('trend-down')).toBeTruthy();
    expect(trendText.classList.contains('trend-down')).toBeTruthy();
  });

  it('should apply correct trend class for neutral trend', () => {
    component.card = {
      ...mockCard,
      trend: {
        direction: 'neutral',
        percentage: 0,
        period: 'stable'
      }
    };
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const trendIcon = compiled.querySelector('.stats-trend mat-icon');
    const trendText = compiled.querySelector('.trend-percentage');
    expect(trendIcon.classList.contains('trend-neutral')).toBeTruthy();
    expect(trendText.classList.contains('trend-neutral')).toBeTruthy();
  });

  it('should handle accent color correctly', () => {
    component.card = { ...mockCard, color: 'accent' };
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const cardElement = compiled.querySelector('.stats-card');
    expect(cardElement.classList.contains('color-accent')).toBeTruthy();
  });

  it('should handle warn color correctly', () => {
    component.card = { ...mockCard, color: 'warn' };
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const cardElement = compiled.querySelector('.stats-card');
    expect(cardElement.classList.contains('color-warn')).toBeTruthy();
  });

  it('should have hover effect styling', () => {
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement;
    const cardElement = compiled.querySelector('.stats-card');
    const computedStyle = window.getComputedStyle(cardElement);
    expect(computedStyle.cursor).toBe('pointer');
  });
});