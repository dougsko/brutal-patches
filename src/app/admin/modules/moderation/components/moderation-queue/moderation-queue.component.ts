import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl } from '@angular/forms';
import { Subject, Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, startWith, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { AdminApiService, ContentModerationItem, BulkOperationResult } from '../../../../services/admin-api.service';
import { AdminLoggerService } from '../../../../services/admin-logger.service';
import { ModerationQueueItem, ModerationAction } from '../../../../interfaces/admin.interfaces';

interface ModerationFilters {
  status: 'all' | 'pending' | 'approved' | 'rejected' | 'escalated';
  priority: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  type: 'all' | 'patch' | 'comment' | 'user_profile' | 'collection';
  assignee: 'all' | 'unassigned' | 'me' | string;
  dateRange: 'all' | '24h' | '7d' | '30d';
}

@Component({
  selector: 'app-moderation-queue',
  templateUrl: './moderation-queue.component.html',
  styleUrls: ['./moderation-queue.component.scss']
})
export class ModerationQueueComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Tab configuration
  activeTabIndex = 0;
  tabs = [
    { label: 'Pending', status: 'pending', badge: 0 },
    { label: 'In Review', status: 'in_review', badge: 0 },
    { label: 'Approved', status: 'approved', badge: 0 },
    { label: 'Rejected', status: 'rejected', badge: 0 },
    { label: 'Escalated', status: 'escalated', badge: 0 }
  ];

  // Table configuration
  displayedColumns: string[] = [
    'select',
    'priority',
    'type',
    'title',
    'author',
    'reports',
    'createdAt',
    'assignedTo',
    'actions'
  ];

  dataSource = new MatTableDataSource<ContentModerationItem>();
  selection = new SelectionModel<ContentModerationItem>(true, []);
  
  // Loading and error states
  loading = false;
  error: string | null = null;
  totalItems = 0;
  lastUpdated = new Date();
  
  // Search and filters
  searchControl = new FormControl('');
  filters: ModerationFilters = {
    status: 'pending',
    priority: 'all',
    type: 'all',
    assignee: 'all',
    dateRange: 'all'
  };

  // Filter options
  priorityOptions = [
    { value: 'all', label: 'All Priorities', icon: 'filter_list', color: '' },
    { value: 'urgent', label: 'Urgent', icon: 'error', color: 'warn' },
    { value: 'high', label: 'High', icon: 'priority_high', color: 'warn' },
    { value: 'medium', label: 'Medium', icon: 'remove', color: 'accent' },
    { value: 'low', label: 'Low', icon: 'expand_more', color: 'primary' }
  ];

  typeOptions = [
    { value: 'all', label: 'All Types', icon: 'category' },
    { value: 'patch', label: 'Patches', icon: 'library_music' },
    { value: 'comment', label: 'Comments', icon: 'comment' },
    { value: 'user_profile', label: 'User Profiles', icon: 'person' },
    { value: 'collection', label: 'Collections', icon: 'collections' }
  ];

  assigneeOptions = [
    { value: 'all', label: 'All Assignees' },
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'me', label: 'Assigned to Me' }
  ];

  dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  // Bulk operations
  availableBulkOperations = [
    { value: 'approve', label: 'Approve Selected', icon: 'check_circle', color: 'primary' },
    { value: 'reject', label: 'Reject Selected', icon: 'cancel', color: 'warn' },
    { value: 'escalate', label: 'Escalate Selected', icon: 'flag', color: 'accent' },
    { value: 'assign_to_me', label: 'Assign to Me', icon: 'person_add', color: 'primary' },
    { value: 'unassign', label: 'Unassign', icon: 'person_remove', color: 'accent' }
  ];

  // Quick actions
  quickActions = [
    { value: 'approve', label: 'Approve', icon: 'check_circle', color: 'primary' },
    { value: 'reject', label: 'Reject', icon: 'cancel', color: 'warn' },
    { value: 'escalate', label: 'Escalate', icon: 'flag', color: 'accent' }
  ];

  private destroy$ = new Subject<void>();
  private refreshInterval: any;

  constructor(
    private adminApi: AdminApiService,
    private logger: AdminLoggerService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadModerationItems();
    this.startAutoRefresh();
    
    this.logger.logAdminAction('moderation_queue_viewed', {
      timestamp: new Date().toISOString()
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private setupSearch(): void {
    // Combine search and filter changes
    combineLatest([
      this.searchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged()
      )
      // Additional filter observables would go here
    ]).pipe(
      takeUntil(this.destroy$),
      switchMap(() => this.loadModerationItemsWithFilters())
    ).subscribe();
  }

  private loadModerationItemsWithFilters(): Observable<ContentModerationItem[]> {
    this.loading = true;
    this.error = null;

    // In a real implementation, we'd pass filters to the API
    return this.adminApi.getContentModerationQueue().pipe(
      catchError(error => {
        this.error = 'Failed to load moderation items. Please try again.';
        this.loading = false;
        this.logger.logError(error, 'ModerationQueueComponent', { action: 'loadModerationItems' });
        return of([]);
      })
    );
  }

  loadModerationItems(): void {
    this.loadModerationItemsWithFilters().subscribe({
      next: (items) => {
        this.dataSource.data = items;
        this.totalItems = items.length;
        this.loading = false;
        this.selection.clear();
        this.updateTabBadges(items);
        this.lastUpdated = new Date();
      },
      error: (error) => {
        this.error = 'Failed to load moderation items. Please try again.';
        this.loading = false;
        this.logger.logError(error, 'ModerationQueueComponent', { action: 'loadModerationItems' });
      }
    });
  }

  private updateTabBadges(items: ContentModerationItem[]): void {
    this.tabs.forEach(tab => {
      tab.badge = items.filter(item => item.status === tab.status).length;
    });
  }

  private startAutoRefresh(): void {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (!this.loading) {
        this.loadModerationItems();
      }
    }, 30000);
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.activeTabIndex = event.index;
    const selectedTab = this.tabs[event.index];
    this.filters.status = selectedTab.status as any;
    this.loadModerationItems();
    
    this.logger.logAdminAction('moderation_tab_changed', {
      tab: selectedTab.label,
      status: selectedTab.status
    });
  }

  onSortChange(sort: Sort): void {
    this.loadModerationItems();
    this.logger.logAdminAction('moderation_queue_sorted', {
      sortBy: sort.active,
      direction: sort.direction
    });
  }

  onPageChange(): void {
    this.loadModerationItems();
    this.logger.logAdminAction('moderation_queue_paged', {
      page: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize
    });
  }

  onRefresh(): void {
    this.loadModerationItems();
    this.logger.logAdminAction('moderation_queue_refreshed', {
      timestamp: new Date().toISOString()
    });
  }

  onFilterChange(): void {
    this.paginator.firstPage();
    this.loadModerationItems();
    this.logger.logAdminAction('moderation_queue_filtered', {
      filters: this.filters
    });
  }

  // Selection methods
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.data.forEach(row => this.selection.select(row));
    }
    
    this.logger.logAdminAction('moderation_selection_toggled', {
      selectedCount: this.selection.selected.length,
      totalCount: this.dataSource.data.length
    });
  }

  toggleSelection(item: ContentModerationItem): void {
    this.selection.toggle(item);
    
    this.logger.logAdminAction('moderation_item_selection_toggled', {
      itemId: item.id,
      type: item.type,
      selected: this.selection.isSelected(item)
    });
  }

  // Individual item actions
  onQuickAction(item: ContentModerationItem, action: string): void {
    const actions = {
      approve: () => this.moderateItem(item, 'approve'),
      reject: () => this.moderateItem(item, 'reject'),
      escalate: () => this.escalateItem(item)
    };

    const actionFn = actions[action as keyof typeof actions];
    if (actionFn) {
      actionFn();
    }
  }

  private moderateItem(item: ContentModerationItem, action: 'approve' | 'reject'): void {
    this.adminApi.moderateContent(item.id, action).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        if (result.success) {
          this.loadModerationItems();
          this.snackBar.open(
            `Item ${action}d successfully`, 
            'Close', 
            { duration: 3000 }
          );
          
          this.logger.logAdminAction('content_moderated', {
            itemId: item.id,
            action: action,
            type: item.type
          });
        }
      },
      error: (error) => {
        this.snackBar.open(
          `Failed to ${action} item. Please try again.`, 
          'Close', 
          { duration: 3000, panelClass: ['error-snackbar'] }
        );
        this.logger.logError(error, 'ModerationQueueComponent', {
          action: `moderateItem_${action}`,
          itemId: item.id
        });
      }
    });
  }

  private escalateItem(item: ContentModerationItem): void {
    // In a real implementation, this would open a dialog for escalation details
    this.logger.logAdminAction('moderation_item_escalated', {
      itemId: item.id,
      type: item.type
    });
    
    this.snackBar.open('Item escalated for review', 'Close', { duration: 3000 });
  }

  onViewItem(item: ContentModerationItem): void {
    // Navigate to detailed view or open dialog
    this.logger.logAdminAction('moderation_item_viewed', {
      itemId: item.id,
      type: item.type,
      title: item.title
    });
  }

  onAssignToMe(item: ContentModerationItem): void {
    // In a real implementation, this would assign the item to the current admin
    this.logger.logAdminAction('moderation_item_assigned', {
      itemId: item.id,
      assignee: 'current_admin'
    });
    
    this.snackBar.open('Item assigned to you', 'Close', { duration: 2000 });
  }

  // Bulk operations
  onBulkOperation(operation: string): void {
    const selectedItems = this.selection.selected;
    
    if (selectedItems.length === 0) {
      this.snackBar.open('Please select items to perform bulk operation', 'Close', { duration: 2000 });
      return;
    }

    switch (operation) {
      case 'approve':
        this.bulkModerateItems(selectedItems, 'approve');
        break;
      case 'reject':
        this.bulkModerateItems(selectedItems, 'reject');
        break;
      case 'escalate':
        this.bulkEscalateItems(selectedItems);
        break;
      case 'assign_to_me':
        this.bulkAssignItems(selectedItems, 'current_admin');
        break;
      case 'unassign':
        this.bulkUnassignItems(selectedItems);
        break;
    }
  }

  private bulkModerateItems(items: ContentModerationItem[], action: 'approve' | 'reject'): void {
    this.loading = true;
    
    const operations = items.map(item => 
      this.adminApi.moderateContent(item.id, action).pipe(
        catchError(error => {
          this.logger.logError(error, 'ModerationQueueComponent', {
            action: `bulk_${action}`,
            itemId: item.id
          });
          return of({ success: false, message: 'Failed' });
        })
      )
    );

    // Execute all operations
    Promise.all(operations.map(op => op.toPromise()))
      .then(results => {
        this.loading = false;
        this.selection.clear();
        this.loadModerationItems();
        
        const successCount = results.filter(r => r?.success).length;
        const failureCount = results.length - successCount;
        
        let message = `${successCount} items ${action}d successfully`;
        if (failureCount > 0) {
          message += `, ${failureCount} failed`;
        }
        
        this.snackBar.open(message, 'Close', { duration: 4000 });
        
        this.logger.logAdminAction('bulk_moderation_completed', {
          action: action,
          totalItems: items.length,
          successCount: successCount,
          failureCount: failureCount
        });
      })
      .catch(error => {
        this.loading = false;
        this.snackBar.open('Bulk operation failed. Please try again.', 'Close', { 
          duration: 3000, 
          panelClass: ['error-snackbar'] 
        });
        this.logger.logError(error, 'ModerationQueueComponent', { action: `bulk_${action}` });
      });
  }

  private bulkEscalateItems(items: ContentModerationItem[]): void {
    // Mock bulk escalation
    this.logger.logAdminAction('bulk_escalation', {
      itemCount: items.length,
      itemIds: items.map(i => i.id)
    });
    
    this.snackBar.open(`${items.length} items escalated for review`, 'Close', { duration: 3000 });
    this.selection.clear();
  }

  private bulkAssignItems(items: ContentModerationItem[], assignee: string): void {
    // Mock bulk assignment
    this.logger.logAdminAction('bulk_assignment', {
      itemCount: items.length,
      assignee: assignee
    });
    
    this.snackBar.open(`${items.length} items assigned to you`, 'Close', { duration: 3000 });
    this.selection.clear();
  }

  private bulkUnassignItems(items: ContentModerationItem[]): void {
    // Mock bulk unassignment
    this.logger.logAdminAction('bulk_unassignment', {
      itemCount: items.length
    });
    
    this.snackBar.open(`${items.length} items unassigned`, 'Close', { duration: 3000 });
    this.selection.clear();
  }

  // Utility methods
  getPriorityIcon(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      urgent: 'error',
      high: 'priority_high',
      medium: 'remove',
      low: 'expand_more'
    };
    return priorityMap[priority] || 'help';
  }

  getPriorityColor(priority: string): string {
    const colorMap: { [key: string]: string } = {
      urgent: 'warn',
      high: 'warn',
      medium: 'accent',
      low: 'primary'
    };
    return colorMap[priority] || '';
  }

  getTypeIcon(type: string): string {
    const typeMap: { [key: string]: string } = {
      patch: 'library_music',
      comment: 'comment',
      user_profile: 'person',
      collection: 'collections'
    };
    return typeMap[type] || 'help';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  }

  trackByItemId(index: number, item: ContentModerationItem): string {
    return item.id;
  }
}