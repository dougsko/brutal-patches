import { Component, Input, OnInit } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { CategoryData } from '../../interfaces/admin.interfaces';

@Component({
  selector: 'app-donut-chart',
  template: `
    <div class="donut-chart-container">
      <app-base-chart 
        [config]="chartConfig" 
        [height]="height"
        [responsive]="responsive">
      </app-base-chart>
      <div class="donut-center-text" *ngIf="centerText">
        <div class="center-value">{{ centerValue }}</div>
        <div class="center-label">{{ centerLabel }}</div>
      </div>
    </div>
  `,
  styles: [`
    .donut-chart-container {
      position: relative;
      width: 100%;
    }
    
    .donut-center-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
    }
    
    .center-value {
      font-size: 2rem;
      font-weight: bold;
      line-height: 1;
      color: #333;
    }
    
    .center-label {
      font-size: 0.875rem;
      color: #666;
      margin-top: 4px;
    }
  `]
})
export class DonutChartComponent implements OnInit {
  @Input() data: CategoryData[] = [];
  @Input() title: string = '';
  @Input() height: string = '300px';
  @Input() responsive: boolean = true;
  @Input() showPercentages: boolean = true;
  @Input() showLabels: boolean = true;
  @Input() centerText: boolean = false;
  @Input() centerValue: string = '';
  @Input() centerLabel: string = '';
  @Input() cutout: string = '60%';
  @Input() colors: string[] = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', 
    '#7b1fa2', '#1976d2', '#c2185b', '#0288d1'
  ];

  chartConfig: ChartConfiguration = {
    type: 'doughnut' as ChartType,
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
    const labels = this.data.map(item => item.category);
    const values = this.data.map(item => item.count);
    const backgroundColors = this.data.map((_, index) => 
      this.data[index].color || this.colors[index % this.colors.length]
    );

    // Calculate center text if not provided
    if (this.centerText && !this.centerValue) {
      const total = values.reduce((a, b) => a + b, 0);
      this.centerValue = total.toString();
      if (!this.centerLabel) {
        this.centerLabel = 'Total';
      }
    }

    this.chartConfig = {
      type: 'doughnut' as ChartType,
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: backgroundColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 4
        }]
      },
      options: {
        ...({ cutout: this.cutout } as any),
        responsive: this.responsive,
        maintainAspectRatio: false,
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
            display: this.showLabels,
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                
                if (this.showPercentages) {
                  return `${label}: ${value} (${percentage}%)`;
                }
                return `${label}: ${value}`;
              }
            }
          }
        }
      }
    };
  }
}