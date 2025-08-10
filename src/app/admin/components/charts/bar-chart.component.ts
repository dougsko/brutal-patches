import { Component, Input, OnInit } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { CategoryData } from '../../interfaces/admin.interfaces';

@Component({
  selector: 'app-bar-chart',
  template: `
    <app-base-chart 
      [config]="chartConfig" 
      [height]="height"
      [responsive]="responsive">
    </app-base-chart>
  `
})
export class BarChartComponent implements OnInit {
  @Input() data: CategoryData[] = [];
  @Input() title: string = '';
  @Input() height: string = '300px';
  @Input() responsive: boolean = true;
  @Input() horizontal: boolean = false;
  @Input() showGrid: boolean = true;
  @Input() colors: string[] = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', 
    '#7b1fa2', '#1976d2', '#c2185b', '#0288d1'
  ];

  chartConfig: ChartConfiguration = {
    type: 'bar' as ChartType,
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
      type: this.horizontal ? 'bar' : 'bar' as ChartType,
      data: {
        labels,
        datasets: [{
          label: this.title,
          data: values,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: this.responsive,
        maintainAspectRatio: false,
        indexAxis: this.horizontal ? 'y' : 'x',
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
              display: this.showGrid
            },
            beginAtZero: true
          },
          y: {
            display: true,
            grid: {
              display: this.showGrid
            },
            beginAtZero: true
          }
        }
      }
    };
  }
}