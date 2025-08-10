import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { ChartConfiguration, ChartType, ChartEvent, ActiveElement } from 'chart.js';
import { TimeSeriesData } from '../../interfaces/admin.interfaces';

@Component({
  selector: 'app-line-chart',
  template: `
    <app-base-chart 
      [config]="chartConfig" 
      [height]="height"
      [responsive]="responsive"
      [ariaLabel]="ariaLabel"
      [ariaDescription]="ariaDescription"
      [enableZoom]="enableZoom"
      [enablePan]="enablePan"
      (chartClick)="onChartClick($event)"
      (chartHover)="onChartHover($event)">
    </app-base-chart>
  `
})
export class LineChartComponent implements OnInit {
  @Input() data: TimeSeriesData[] = [];
  @Input() title: string = '';
  @Input() height: string = '300px';
  @Input() responsive: boolean = true;
  @Input() color: string = '#1976d2';
  @Input() fillArea: boolean = false;
  @Input() showGrid: boolean = true;
  @Input() showPoints: boolean = true;
  @Input() tension: number = 0.1;
  @Input() ariaLabel: string = 'Line chart';
  @Input() ariaDescription: string = '';
  @Input() enableZoom: boolean = true;
  @Input() enablePan: boolean = true;

  @Output() chartClick = new EventEmitter<{event: ChartEvent, elements: ActiveElement[]}>();
  @Output() chartHover = new EventEmitter<{event: ChartEvent, elements: ActiveElement[]}>();

  chartConfig: ChartConfiguration = {
    type: 'line' as ChartType,
    data: {
      labels: [],
      datasets: []
    },
    options: {}
  };

  ngOnInit(): void {
    this.updateChart();
  }

  ngOnChanges(): void {
    this.updateChart();
  }

  private updateChart(): void {
    const labels = this.data.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    });

    const values = this.data.map(item => item.value);

    // Adjust colors for dark mode
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const adjustedColor = isDarkMode ? this.getLightVariant(this.color) : this.color;

    this.chartConfig = {
      type: 'line' as ChartType,
      data: {
        labels,
        datasets: [{
          label: this.title,
          data: values,
          borderColor: adjustedColor,
          backgroundColor: this.fillArea ? adjustedColor + '30' : 'transparent',
          fill: this.fillArea,
          tension: this.tension,
          pointRadius: this.showPoints ? 4 : 0,
          pointHoverRadius: 6,
          borderWidth: 2,
          pointBackgroundColor: adjustedColor,
          pointBorderColor: adjustedColor,
          pointHoverBackgroundColor: adjustedColor,
          pointHoverBorderColor: isDarkMode ? '#fff' : '#000'
        }]
      },
      options: {
        responsive: this.responsive,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          title: {
            display: !!this.title,
            text: this.title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: this.showGrid,
              color: (context) => {
                // Dark mode support for grid lines
                return window.matchMedia('(prefers-color-scheme: dark)').matches 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.1)';
              }
            },
            ticks: {
              maxTicksLimit: 8,
              color: (context) => {
                // Dark mode support for tick labels
                return window.matchMedia('(prefers-color-scheme: dark)').matches 
                  ? '#e0e0e0' 
                  : '#666';
              }
            }
          },
          y: {
            display: true,
            grid: {
              display: this.showGrid,
              color: (context) => {
                return window.matchMedia('(prefers-color-scheme: dark)').matches 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.1)';
              }
            },
            beginAtZero: true,
            ticks: {
              color: (context) => {
                return window.matchMedia('(prefers-color-scheme: dark)').matches 
                  ? '#e0e0e0' 
                  : '#666';
              }
            }
          }
        }
      }
    };
  }

  onChartClick(event: {event: ChartEvent, elements: ActiveElement[]}): void {
    this.chartClick.emit(event);
  }

  onChartHover(event: {event: ChartEvent, elements: ActiveElement[]}): void {
    this.chartHover.emit(event);
  }

  private getLightVariant(color: string): string {
    // Convert common dark colors to lighter variants for dark mode
    const colorMap: { [key: string]: string } = {
      '#1976d2': '#64b5f6', // Blue
      '#388e3c': '#81c784', // Green
      '#d32f2f': '#e57373', // Red
      '#f57c00': '#ffb74d', // Orange
      '#7b1fa2': '#ba68c8', // Purple
      '#5d4037': '#a1887f', // Brown
      '#455a64': '#90a4ae'  // Blue Grey
    };
    
    return colorMap[color] || color;
  }
}