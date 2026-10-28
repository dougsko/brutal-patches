import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ViewChild, 
  ElementRef, 
  AfterViewInit, 
  OnDestroy, 
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { throttleTime, takeUntil } from 'rxjs/operators';

interface VirtualScrollItem {
  [key: string]: any;
}

interface ColumnConfig {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  formatter?: (value: any) => string;
}

@Component({
  selector: 'app-virtual-scroll-table',
  template: `
    <div class="virtual-scroll-container" 
         [attr.aria-label]="ariaLabel"
         role="table"
         [style.height]="containerHeight">
      
      <!-- Header -->
      <div class="table-header" 
           role="rowgroup"
           [attr.aria-label]="'Table header'">
        <div class="table-row header-row" role="row">
          <div *ngFor="let col of columns" 
               class="table-cell header-cell"
               [style.width]="col.width || 'auto'"
               role="columnheader"
               [attr.aria-sort]="getSortAttribute(col.key)"
               [attr.tabindex]="col.sortable ? 0 : -1"
               [attr.aria-label]="col.header + (col.sortable ? ' sortable' : '')"
               (click)="onSort(col)"
               (keydown.enter)="onSort(col)"
               (keydown.space)="onSort(col)"
               [ngClass]="{'sortable': col.sortable}">
            {{ col.header }}
            <mat-icon *ngIf="col.sortable && sortColumn === col.key"
                      aria-hidden="true"
                      class="sort-icon">
              {{ sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
            </mat-icon>
          </div>
        </div>
      </div>

      <!-- Virtual Scroll Viewport -->
      <div class="virtual-viewport" 
           #viewport
           role="rowgroup"
           [attr.aria-label]="'Table data'"
           [attr.aria-rowcount]="totalItems"
           [style.height]="viewportHeight"
           (scroll)="onScroll()">
        
        <!-- Virtual spacer before visible items -->
        <div class="virtual-spacer" 
             [style.height.px]="offsetY"
             aria-hidden="true">
        </div>

        <!-- Visible items -->
        <div *ngFor="let item of visibleItems; let i = index; trackBy: trackByFn"
             class="table-row data-row"
             role="row"
             [attr.aria-rowindex]="startIndex + i + 2"
             [attr.tabindex]="0"
             [attr.aria-label]="getRowAriaLabel(item, i)"
             (keydown.enter)="onRowSelect(item)"
             (keydown.space)="onRowSelect(item)"
             (click)="onRowSelect(item)">
          <div *ngFor="let col of columns"
               class="table-cell data-cell"
               [style.width]="col.width || 'auto'"
               role="gridcell"
               [attr.aria-label]="col.header + ': ' + getFormattedValue(item, col)">
            {{ getFormattedValue(item, col) }}
          </div>
        </div>

        <!-- Virtual spacer after visible items -->
        <div class="virtual-spacer" 
             [style.height.px]="totalHeight - offsetY - (visibleItems.length * itemHeight)"
             aria-hidden="true">
        </div>
      </div>

      <!-- Loading indicator -->
      <div *ngIf="loading" 
           class="loading-overlay"
           role="status"
           aria-live="polite"
           aria-label="Loading table data">
        <mat-spinner diameter="32"></mat-spinner>
        <span>Loading data...</span>
      </div>

      <!-- No data message -->
      <div *ngIf="!loading && totalItems === 0"
           class="no-data-message"
           role="status"
           aria-label="No data available">
        <mat-icon>search_off</mat-icon>
        <span>No data available</span>
      </div>
    </div>
  `,
  styles: [`
    .virtual-scroll-container {
      position: relative;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #fff;
      overflow: hidden;
    }

    .table-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
    }

    .table-row {
      display: flex;
      min-height: 48px;
      align-items: center;
    }

    .header-row {
      background: #f5f5f5;
    }

    .data-row {
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .data-row:hover,
    .data-row:focus {
      background-color: #f8f9fa;
      outline: none;
    }

    .data-row:focus {
      box-shadow: inset 0 0 0 2px #1976d2;
    }

    .table-cell {
      padding: 8px 16px;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;
    }

    .header-cell {
      font-weight: 600;
      color: #333;
      user-select: none;
    }

    .header-cell.sortable {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background-color 0.2s;
    }

    .header-cell.sortable:hover,
    .header-cell.sortable:focus {
      background-color: #e8f4f8;
      outline: none;
    }

    .header-cell.sortable:focus {
      box-shadow: inset 0 0 0 2px #1976d2;
    }

    .sort-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-left: 4px;
    }

    .virtual-viewport {
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
    }

    .virtual-spacer {
      width: 100%;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 20;
    }

    .no-data-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #666;
      gap: 16px;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.5;
      }
    }

    // Dark mode support
    @media (prefers-color-scheme: dark) {
      .virtual-scroll-container {
        border-color: #333;
        background: #1a1a1a;
        color: #e0e0e0;
      }

      .table-header {
        background: #2d2d2d;
        border-bottom-color: #333;
      }

      .header-row {
        background: #2d2d2d;
      }

      .header-cell {
        color: #e0e0e0;
      }

      .header-cell.sortable:hover,
      .header-cell.sortable:focus {
        background-color: #3d3d3d;
      }

      .data-row {
        border-bottom-color: #333;
      }

      .data-row:hover,
      .data-row:focus {
        background-color: #2d2d2d;
      }

      .data-row:focus {
        box-shadow: inset 0 0 0 2px #64b5f6;
      }

      .header-cell.sortable:focus {
        box-shadow: inset 0 0 0 2px #64b5f6;
      }

      .loading-overlay {
        background: rgba(26, 26, 26, 0.8);
        color: #e0e0e0;
      }

      .no-data-message {
        color: #b0b0b0;
      }
    }

    // Responsive design
    @media (max-width: 768px) {
      .table-cell {
        padding: 6px 8px;
        font-size: 14px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VirtualScrollTableComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewport', { static: false }) viewport!: ElementRef<HTMLDivElement>;

  @Input() data: VirtualScrollItem[] = [];
  @Input() columns: ColumnConfig[] = [];
  @Input() itemHeight: number = 48;
  @Input() containerHeight: string = '400px';
  @Input() loading: boolean = false;
  @Input() ariaLabel: string = 'Data table';

  @Output() rowSelect = new EventEmitter<VirtualScrollItem>();
  @Output() sortChange = new EventEmitter<{column: string, direction: 'asc' | 'desc'}>();

  // Virtual scrolling properties
  visibleItems: VirtualScrollItem[] = [];
  startIndex: number = 0;
  endIndex: number = 0;
  offsetY: number = 0;
  totalHeight: number = 0;
  viewportHeight: string = '352px'; // containerHeight - header height
  totalItems: number = 0;

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();
  private scrollThrottle = 16; // ~60fps

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.calculateViewportHeight();
    this.updateVirtualScroll();

    if (this.viewport) {
      fromEvent(this.viewport.nativeElement, 'scroll')
        .pipe(
          throttleTime(this.scrollThrottle),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.updateVirtualScroll();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(): void {
    this.totalItems = this.data.length;
    this.totalHeight = this.totalItems * this.itemHeight;
    this.updateVirtualScroll();
  }

  private calculateViewportHeight(): void {
    const containerHeightNum = parseInt(this.containerHeight.replace('px', ''));
    this.viewportHeight = `${containerHeightNum - 48}px`; // Subtract header height
  }

  private updateVirtualScroll(): void {
    if (!this.viewport) return;

    const scrollTop = this.viewport.nativeElement.scrollTop;
    const viewportHeight = this.viewport.nativeElement.clientHeight;
    
    // Calculate visible range with buffer
    const bufferSize = 5;
    this.startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - bufferSize);
    const visibleCount = Math.ceil(viewportHeight / this.itemHeight) + (bufferSize * 2);
    this.endIndex = Math.min(this.data.length, this.startIndex + visibleCount);

    // Update visible items
    this.visibleItems = this.data.slice(this.startIndex, this.endIndex);
    this.offsetY = this.startIndex * this.itemHeight;

    this.cdr.markForCheck();
  }

  onScroll(): void {
    // This will be throttled by the RxJS stream
    this.updateVirtualScroll();
  }

  onSort(column: ColumnConfig): void {
    if (!column.sortable) return;

    if (this.sortColumn === column.key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column.key;
      this.sortDirection = 'asc';
    }

    this.sortChange.emit({ column: column.key, direction: this.sortDirection });
  }

  onRowSelect(item: VirtualScrollItem): void {
    this.rowSelect.emit(item);
  }

  getSortAttribute(columnKey: string): string {
    if (this.sortColumn !== columnKey) return 'none';
    return this.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  getFormattedValue(item: VirtualScrollItem, column: ColumnConfig): string {
    const value = item[column.key];
    return column.formatter ? column.formatter(value) : String(value || '');
  }

  getRowAriaLabel(item: VirtualScrollItem, index: number): string {
    const rowNumber = this.startIndex + index + 1;
    const firstColumnValue = this.columns.length > 0 ? 
      this.getFormattedValue(item, this.columns[0]) : '';
    return `Row ${rowNumber}: ${firstColumnValue}`;
  }

  trackByFn(index: number, item: VirtualScrollItem): any {
    return item.id || index;
  }
}