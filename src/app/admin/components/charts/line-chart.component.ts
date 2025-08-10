import { Component, Input, OnInit } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import { TimeSeriesData } from '../../interfaces/admin.interfaces';

@Component({
  selector: 'app-line-chart',
  template: `
    <app-base-chart 
      [config]="chartConfig" 
      [height]="height"
      [responsive]="responsive">
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

    this.chartConfig = {
      type: 'line' as ChartType,
      data: {
        labels,
        datasets: [{
          label: this.title,
          data: values,
          borderColor: this.color,
          backgroundColor: this.fillArea ? this.color + '20' : 'transparent',
          fill: this.fillArea,
          tension: this.tension,
          pointRadius: this.showPoints ? 4 : 0,
          pointHoverRadius: 6,
          borderWidth: 2
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
              display: this.showGrid
            },
            ticks: {
              maxTicksLimit: 8
            }
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