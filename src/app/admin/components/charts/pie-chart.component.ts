import { Component, Input, OnInit } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { CategoryData } from '../../interfaces/admin.interfaces';

@Component({
  selector: 'app-pie-chart',
  template: `
    <app-base-chart 
      [config]="chartConfig" 
      [height]="height"
      [responsive]="responsive">
    </app-base-chart>
  `
})
export class PieChartComponent implements OnInit {
  @Input() data: CategoryData[] = [];
  @Input() title: string = '';
  @Input() height: string = '300px';
  @Input() responsive: boolean = true;
  @Input() showPercentages: boolean = true;
  @Input() showLabels: boolean = true;
  @Input() colors: string[] = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', 
    '#7b1fa2', '#1976d2', '#c2185b', '#0288d1'
  ];

  chartConfig: ChartConfiguration = {
    type: 'pie' as ChartType,
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

    this.chartConfig = {
      type: 'pie' as ChartType,
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
            position: 'right',
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