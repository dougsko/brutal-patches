import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables, ChartEvent, ActiveElement } from 'chart.js';
// import zoomPlugin from 'chartjs-plugin-zoom'; // Temporarily disabled

// Register Chart.js components
Chart.register(...registerables); // zoomPlugin disabled temporarily

@Component({
  selector: 'app-base-chart',
  template: `
    <div class="chart-container" [style.height]="height">
      <canvas #chartCanvas 
              [attr.aria-label]="ariaLabel"
              [attr.aria-describedby]="ariaDescribedby"
              role="img"
              tabindex="0"
              (keydown)="onKeyDown($event)">
      </canvas>
      <div [id]="ariaDescribedby" class="sr-only" *ngIf="ariaDescription">
        {{ ariaDescription }}
      </div>
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
    canvas:focus {
      outline: 2px solid #1976d2;
      outline-offset: 2px;
    }
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
    @media (prefers-color-scheme: dark) {
      canvas:focus {
        outline-color: #64b5f6;
      }
    }
  `]
})
export class BaseChartComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() config!: ChartConfiguration;
  @Input() height: string = '300px';
  @Input() responsive: boolean = true;
  @Input() maintainAspectRatio: boolean = false;
  @Input() ariaLabel: string = 'Chart';
  @Input() ariaDescription: string = '';
  @Input() enableZoom: boolean = true;
  @Input() enablePan: boolean = true;

  @Output() chartClick = new EventEmitter<{event: ChartEvent, elements: ActiveElement[]}>();
  @Output() chartHover = new EventEmitter<{event: ChartEvent, elements: ActiveElement[]}>();

  protected chart: Chart | null = null;
  
  get ariaDescribedby(): string {
    return `chart-desc-${Math.random().toString(36).substr(2, 9)}`;
  }

  ngOnInit(): void {
    // Set default responsive options
    if (this.responsive) {
      this.config.options = {
        ...this.config.options,
        responsive: true,
        maintainAspectRatio: this.maintainAspectRatio,
        onClick: (event: ChartEvent, elements: ActiveElement[]) => {
          this.chartClick.emit({ event, elements });
        },
        onHover: (event: ChartEvent, elements: ActiveElement[]) => {
          this.chartHover.emit({ event, elements });
        },
        plugins: {
          ...this.config.options?.plugins,
          legend: {
            ...this.config.options?.plugins?.legend,
            position: 'top'
          },
          // zoom: this.enableZoom ? {
          //   pan: {
          //     enabled: this.enablePan,
          //     mode: 'xy'
          //   },
          //   zoom: {
          //     wheel: {
          //       enabled: true,
          //     },
          //     pinch: {
          //       enabled: true
          //     },
          //     mode: 'xy',
          //   }
          // } : {} // Zoom temporarily disabled
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

  public resetZoom(): void {
    if (this.chart && (this.chart as any).resetZoom) {
      (this.chart as any).resetZoom();
    }
  }

  // Keyboard interaction handler
  onKeyDown(event: KeyboardEvent): void {
    if (!this.chart) return;

    switch (event.key) {
      case 'r':
      case 'R':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.resetZoom();
        }
        break;
      case '+':
      case '=':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          // Zoom in programmatically
          if ((this.chart as any).zoom) {
            (this.chart as any).zoom(1.1);
          }
        }
        break;
      case '-':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          // Zoom out programmatically
          if ((this.chart as any).zoom) {
            (this.chart as any).zoom(0.9);
          }
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Emit click event for keyboard users
        this.chartClick.emit({ 
          event: event as any, 
          elements: this.chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true)
        });
        break;
    }
  }
}