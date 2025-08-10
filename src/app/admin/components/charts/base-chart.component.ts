import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-base-chart',
  template: `
    <div class="chart-container" [style.height]="height">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `]
})
export class BaseChartComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() config!: ChartConfiguration;
  @Input() height: string = '300px';
  @Input() responsive: boolean = true;
  @Input() maintainAspectRatio: boolean = false;

  protected chart: Chart | null = null;

  ngOnInit(): void {
    // Set default responsive options
    if (this.responsive) {
      this.config.options = {
        ...this.config.options,
        responsive: true,
        maintainAspectRatio: this.maintainAspectRatio,
        plugins: {
          ...this.config.options?.plugins,
          legend: {
            ...this.config.options?.plugins?.legend,
            position: 'top'
          }
        }
      };
    }
  }

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.chart = new Chart(ctx, this.config);
    }
  }

  public updateChart(newConfig: ChartConfiguration): void {
    if (this.chart) {
      this.chart.data = newConfig.data;
      this.chart.options = { ...this.chart.options, ...newConfig.options };
      this.chart.update();
    }
  }

  public updateData(data: any): void {
    if (this.chart) {
      this.chart.data = data;
      this.chart.update();
    }
  }
}