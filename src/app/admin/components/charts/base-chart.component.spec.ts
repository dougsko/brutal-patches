import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';

import { BaseChartComponent } from './base-chart.component';

describe('BaseChartComponent', () => {
  let component: BaseChartComponent;
  let fixture: ComponentFixture<BaseChartComponent>;
  let mockCanvas: jasmine.SpyObj<HTMLCanvasElement>;
  let mockContext: jasmine.SpyObj<CanvasRenderingContext2D>;
  let mockChart: any;

  const mockChartConfig: ChartConfiguration = {
    type: 'line' as ChartType,
    data: {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{
        label: 'Test Data',
        data: [10, 20, 15]
      }]
    },
    options: {
      responsive: true
    }
  };

  beforeEach(async () => {
    // Create spies for canvas and context
    mockContext = jasmine.createSpyObj('CanvasRenderingContext2D', ['getContext']);
    mockCanvas = jasmine.createSpyObj('HTMLCanvasElement', ['getContext']);
    mockCanvas.getContext.and.returnValue(mockContext);

    // Create spy for Chart constructor
    mockChart = jasmine.createSpyObj('Chart', ['destroy', 'update']);
    
    // Mock Chart constructor
    (globalThis as any).Chart = jasmine.createSpy('Chart').and.returnValue(mockChart);

    await TestBed.configureTestingModule({
      declarations: [BaseChartComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BaseChartComponent);
    component = fixture.componentInstance;
    
    // Mock the ViewChild reference
    component.chartCanvas = new ElementRef(mockCanvas);
    component.config = mockChartConfig;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set default responsive options on init', () => {
    component.responsive = true;
    component.maintainAspectRatio = false;
    
    component.ngOnInit();

    expect(component.config.options?.responsive).toBe(true);
    expect(component.config.options?.maintainAspectRatio).toBe(false);
    expect(component.config.options?.plugins?.legend?.position).toBe('top');
  });

  it('should create chart after view init', () => {
    spyOn<any>(component, 'createChart');
    
    component.ngAfterViewInit();

    expect(component['createChart']).toHaveBeenCalled();
  });

  it('should destroy chart on component destroy', () => {
    component['chart'] = mockChart;
    
    component.ngOnDestroy();

    expect(mockChart.destroy).toHaveBeenCalled();
  });

  it('should create new chart instance', () => {
    component['createChart']();

    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    expect((globalThis as any).Chart).toHaveBeenCalledWith(mockContext, mockChartConfig);
  });

  it('should destroy existing chart before creating new one', () => {
    component['chart'] = mockChart;
    
    component['createChart']();

    expect(mockChart.destroy).toHaveBeenCalled();
  });

  it('should handle null context gracefully', () => {
    mockCanvas.getContext.and.returnValue(null);
    
    expect(() => component['createChart']()).not.toThrow();
  });

  it('should update existing chart with new config', () => {
    component['chart'] = mockChart;
    const newConfig = { ...mockChartConfig };
    newConfig.data.labels = ['Apr', 'May', 'Jun'];

    component.updateChart(newConfig);

    expect(mockChart.data).toBe(newConfig.data);
    expect(mockChart.update).toHaveBeenCalled();
  });

  it('should update chart data only', () => {
    component['chart'] = mockChart;
    const newData = {
      labels: ['Apr', 'May', 'Jun'],
      datasets: [{ label: 'New Data', data: [30, 40, 35] }]
    };

    component.updateData(newData);

    expect(mockChart.data).toBe(newData);
    expect(mockChart.update).toHaveBeenCalled();
  });

  it('should not update chart if chart instance does not exist', () => {
    component['chart'] = null;
    const newConfig = { ...mockChartConfig };

    expect(() => component.updateChart(newConfig)).not.toThrow();
    expect(() => component.updateData(newConfig.data)).not.toThrow();
  });

  it('should use default height if not provided', () => {
    expect(component.height).toBe('300px');
  });

  it('should use provided height', () => {
    component.height = '500px';
    expect(component.height).toBe('500px');
  });

  it('should use default responsive setting if not provided', () => {
    expect(component.responsive).toBe(true);
  });

  it('should use default maintainAspectRatio setting if not provided', () => {
    expect(component.maintainAspectRatio).toBe(false);
  });
});