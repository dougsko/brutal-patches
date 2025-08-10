import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnChanges, 
  SimpleChanges 
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

interface AnalyticsTableData {
  [key: string]: any;
}

interface TableColumn {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  formatter?: (value: any) => string;
}

@Component({
  selector: 'app-analytics-data-table',
  template: `
    <div class="analytics-table-container" 
         [attr.aria-label]="title + ' data table'">
      
      <!-- Table Header -->
      <div class="table-header-section">
        <h3 class="table-title" [id]="titleId">{{ title }}</h3>
        
        <div class="table-controls" role="toolbar" aria-label="Table controls">
          <!-- Search -->
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search</mat-label>
            <input matInput 
                   [(ngModel)]="searchTerm"
                   (input)="onSearch()"
                   [attr.aria-describedby]="titleId"
                   placeholder="Search in table data...">
            <mat-icon matSuffix aria-hidden="true">search</mat-icon>
          </mat-form-field>

          <!-- Export Button -->
          <button mat-raised-button 
                  color="primary"
                  (click)="onExport()"
                  [disabled]="loading || filteredData.length === 0"
                  aria-label="Export table data to CSV">
            <mat-icon aria-hidden="true">download</mat-icon>
            Export CSV
          </button>
        </div>
      </div>

      <!-- Loading/Error States -->
      <mat-card *ngIf="error" 
                class="error-card"
                role="alert"
                aria-labelledby="error-title">
        <mat-card-content>
          <div class="error-content">
            <mat-icon color="warn" aria-hidden="true">error</mat-icon>
            <span id="error-title">{{ error }}</span>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Virtual Scroll Table -->
      <app-virtual-scroll-table
        [data]="paginatedData"
        [columns]="columns"
        [loading]="loading"
        [itemHeight]="itemHeight"
        [containerHeight]="tableHeight"
        [ariaLabel]="title + ' data'"
        (rowSelect)="onRowSelect($event)"
        (sortChange)="onSortChange($event)">
      </app-virtual-scroll-table>

      <!-- Pagination -->
      <mat-paginator
        [length]="filteredData.length"
        [pageSize]="pageSize"
        [pageSizeOptions]="pageSizeOptions"
        [pageIndex]="currentPage"
        [showFirstLastButtons]="true"
        [hidePageSize]="false"
        [disabled]="loading"
        (page)="onPageChange($event)"
        [attr.aria-label]="'Pagination for ' + title"
        class="table-paginator">
      </mat-paginator>

      <!-- Summary Info -->
      <div class="table-summary" 
           role="status"
           aria-live="polite"
           [attr.aria-label]="getSummaryText()">
        {{ getSummaryText() }}
      </div>
    </div>
  `,
  styles: [`
    .analytics-table-container {
      margin-bottom: 24px;
    }

    .table-header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .table-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: #1a1a1a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .table-controls {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-field {
      width: 250px;
      min-width: 200px;
    }

    .error-card {
      margin-bottom: 16px;
      background-color: #ffebee;
      border-left: 4px solid #d32f2f;
    }

    .error-content {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #d32f2f;
    }

    .table-paginator {
      margin-top: 8px;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
    }

    .table-summary {
      padding: 8px 16px;
      font-size: 0.875rem;
      color: #666;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
      text-align: center;
    }

    // Dark mode support
    @media (prefers-color-scheme: dark) {
      .table-title {
        color: #e0e0e0;
      }

      .error-card {
        background-color: #3a1f1f;
        border-left-color: #f44336;
      }

      .table-paginator {
        border-top-color: #333;
        background: #2d2d2d;
      }

      .table-summary {
        color: #b0b0b0;
        background: #2d2d2d;
        border-top-color: #333;
      }
    }

    // Responsive design
    @media (max-width: 768px) {
      .table-header-section {
        flex-direction: column;
        align-items: stretch;
      }

      .table-controls {
        justify-content: center;
      }

      .search-field {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .table-title {
        font-size: 1.1rem;
        text-align: center;
      }

      .search-field {
        min-width: 150px;
      }
    }
  `]
})
export class AnalyticsDataTableComponent implements OnInit, OnChanges {
  @Input() title: string = 'Data Table';
  @Input() data: AnalyticsTableData[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() loading: boolean = false;
  @Input() error: string | null = null;
  @Input() pageSize: number = 50;
  @Input() pageSizeOptions: number[] = [25, 50, 100, 200];
  @Input() itemHeight: number = 48;
  @Input() tableHeight: string = '400px';
  @Input() exportFilename: string = 'analytics-data';

  @Output() rowSelect = new EventEmitter<AnalyticsTableData>();
  @Output() sortChange = new EventEmitter<{column: string, direction: 'asc' | 'desc'}>();
  @Output() exportData = new EventEmitter<{data: AnalyticsTableData[], filename: string}>();

  // Pagination and filtering
  filteredData: AnalyticsTableData[] = [];
  paginatedData: AnalyticsTableData[] = [];
  currentPage: number = 0;
  searchTerm: string = '';

  get titleId(): string {
    return this.title.toLowerCase().replace(/\s+/g, '-') + '-title';
  }

  ngOnInit(): void {
    this.updateData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['searchTerm']) {
      this.updateData();
    }
  }

  private updateData(): void {
    // Apply search filter
    this.filteredData = this.searchTerm 
      ? this.data.filter(item => this.matchesSearch(item, this.searchTerm))
      : [...this.data];

    // Reset to first page when data changes
    this.currentPage = 0;
    this.updatePagination();
  }

  private matchesSearch(item: AnalyticsTableData, searchTerm: string): boolean {
    const normalizedTerm = searchTerm.toLowerCase().trim();
    
    return this.columns.some(column => {
      const value = item[column.key];
      if (value == null) return false;
      
      const formattedValue = column.formatter 
        ? column.formatter(value) 
        : String(value);
      
      return formattedValue.toLowerCase().includes(normalizedTerm);
    });
  }

  private updatePagination(): void {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredData.length);
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  onSearch(): void {
    this.updateData();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagination();
  }

  onRowSelect(item: AnalyticsTableData): void {
    this.rowSelect.emit(item);
  }

  onSortChange(sort: {column: string, direction: 'asc' | 'desc'}): void {
    // Apply sorting to filtered data
    this.filteredData.sort((a, b) => {
      const aValue = a[sort.column];
      const bValue = b[sort.column];
      
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }
      
      return sort.direction === 'asc' ? comparison : -comparison;
    });

    // Reset to first page after sorting
    this.currentPage = 0;
    this.updatePagination();
    this.sortChange.emit(sort);
  }

  onExport(): void {
    const dataToExport = this.filteredData.length > 0 ? this.filteredData : this.data;
    const filename = this.searchTerm 
      ? `${this.exportFilename}-filtered` 
      : this.exportFilename;
    
    this.exportData.emit({ data: dataToExport, filename });
    this.downloadAsCSV(dataToExport, filename);
  }

  private downloadAsCSV(data: AnalyticsTableData[], filename: string): void {
    if (!data || data.length === 0) {
      return;
    }

    // Use column headers for CSV headers
    const headers = this.columns.map(col => col.header).join(',');
    const csvContent = data.map(row => 
      this.columns.map(col => {
        const value = row[col.key];
        const formatted = col.formatter ? col.formatter(value) : String(value || '');
        return formatted.includes(',') ? `"${formatted}"` : formatted;
      }).join(',')
    ).join('\n');

    const csv = `${headers}\n${csvContent}`;
    
    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getSummaryText(): string {
    const total = this.data.length;
    const filtered = this.filteredData.length;
    const start = Math.min(this.currentPage * this.pageSize + 1, filtered);
    const end = Math.min((this.currentPage + 1) * this.pageSize, filtered);

    if (total === 0) {
      return 'No data available';
    }

    if (filtered < total) {
      return `Showing ${start} to ${end} of ${filtered} filtered results (${total} total)`;
    }

    return `Showing ${start} to ${end} of ${total} results`;
  }
}