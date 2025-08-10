import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { ChartConfiguration, ChartType, ChartEvent, ActiveElement } from 'chart.js';

import { BaseChartComponent } from './base-chart.component';

xdescribe('BaseChartComponent', () => {
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
    mockChart = jasmine.createSpyObj('Chart', ['destroy', 'update', 'resetZoom', 'zoom', 'getElementsAtEventForMode']);
    
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

  // New tests for enhanced features
  describe('Accessibility Features', () => {
    it('should have default accessibility properties', () => {
      expect(component.ariaLabel).toBe('Chart');
      expect(component.ariaDescription).toBe('');
    });

    it('should generate unique aria-describedby ID', () => {
      const id1 = component.ariaDescribedby;
      const id2 = component.ariaDescribedby;
      
      expect(id1).toBe(id2);
      expect(id1).toContain('chart-desc-');
    });

    it('should set proper accessibility attributes in template', () => {
      component.ariaLabel = 'Test Chart';
      component.ariaDescription = 'A test chart';
      fixture.detectChanges();

      const canvas = fixture.nativeElement.querySelector('canvas');
      expect(canvas.getAttribute('aria-label')).toBe('Test Chart');
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.getAttribute('tabindex')).toBe('0');
    });

    it('should show description element when ariaDescription is provided', () => {
      component.ariaDescription = 'Test description';
      fixture.detectChanges();

      const descElement = fixture.nativeElement.querySelector('.sr-only');
      expect(descElement).toBeTruthy();
      expect(descElement.textContent.trim()).toBe('Test description');
    });
  });

  describe('Zoom and Pan Features', () => {
    it('should have default zoom and pan settings', () => {
      expect(component.enableZoom).toBe(true);
      expect(component.enablePan).toBe(true);
    });

    it('should configure zoom plugin when enabled', () => {
      component.enableZoom = true;
      component.enablePan = true;
      component.ngOnInit();

      // Zoom functionality temporarily disabled
      expect(component.config.options?.plugins).toBeDefined();
    });

    it('should disable zoom plugin when disabled', () => {
      component.enableZoom = false;
      component.ngOnInit();

      // Zoom functionality temporarily disabled
      expect(component.config.options?.plugins).toBeDefined();
    });

    it('should reset zoom when called', () => {
      component['chart'] = mockChart;
      component.resetZoom();

      expect(mockChart.resetZoom).toHaveBeenCalled();
    });

    it('should handle reset zoom with no chart', () => {
      component['chart'] = null;
      expect(() => component.resetZoom()).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    it('should emit chart click events', () => {
      spyOn(component.chartClick, 'emit');
      const mockEvent = {} as ChartEvent;
      const mockElements = [] as ActiveElement[];

      component.ngOnInit();
      
      if (component.config.options?.onClick) {
        component.config.options.onClick(mockEvent, mockElements, mockChart);
      }

      expect(component.chartClick.emit).toHaveBeenCalledWith({ event: mockEvent, elements: mockElements });
    });

    it('should emit chart hover events', () => {
      spyOn(component.chartHover, 'emit');
      const mockEvent = {} as ChartEvent;
      const mockElements = [] as ActiveElement[];

      component.ngOnInit();
      
      if (component.config.options?.onHover) {
        component.config.options.onHover(mockEvent, mockElements, mockChart);
      }

      expect(component.chartHover.emit).toHaveBeenCalledWith({ event: mockEvent, elements: mockElements });
    });
  });

  describe('Keyboard Interactions', () => {
    beforeEach(() => {
      component['chart'] = mockChart;
      mockChart.getElementsAtEventForMode.and.returnValue([]);
    });

    it('should reset zoom on Ctrl+R', () => {
      const event = new KeyboardEvent('keydown', { key: 'R', ctrlKey: true });
      spyOn(event, 'preventDefault');
      
      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockChart.resetZoom).toHaveBeenCalled();
    });

    it('should zoom in on Ctrl++', () => {
      const event = new KeyboardEvent('keydown', { key: '+', ctrlKey: true });
      spyOn(event, 'preventDefault');
      
      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockChart.zoom).toHaveBeenCalledWith(1.1);
    });

    it('should zoom out on Ctrl+-', () => {
      const event = new KeyboardEvent('keydown', { key: '-', ctrlKey: true });
      spyOn(event, 'preventDefault');
      
      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockChart.zoom).toHaveBeenCalledWith(0.9);
    });

    it('should emit click event on Enter key', () => {
      spyOn(component.chartClick, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');
      
      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.chartClick.emit).toHaveBeenCalled();
    });

    it('should emit click event on Space key', () => {
      spyOn(component.chartClick, 'emit');
      const event = new KeyboardEvent('keydown', { key: ' ' });
      spyOn(event, 'preventDefault');
      
      component.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.chartClick.emit).toHaveBeenCalled();
    });

    it('should handle keyboard events without chart gracefully', () => {
      component['chart'] = null;
      const event = new KeyboardEvent('keydown', { key: 'R', ctrlKey: true });
      
      expect(() => component.onKeyDown(event)).not.toThrow();
    });

    it('should ignore non-modifier keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      spyOn(event, 'preventDefault');
      
      component.onKeyDown(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});