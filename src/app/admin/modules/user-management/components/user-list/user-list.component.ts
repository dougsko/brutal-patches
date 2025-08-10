import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl } from '@angular/forms';
import { Subject, Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, startWith, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { AdminApiService, AdminUser, BulkOperationResult } from '../../../../services/admin-api.service';
import { AdminLoggerService } from '../../../../services/admin-logger.service';
import { AdminUserProfile } from '../../../../interfaces/admin.interfaces';

interface UserListFilters {
  status: 'all' | 'active' | 'suspended' | 'banned' | 'pending';
  role: string;
  dateRange: 'all' | '7d' | '30d' | '90d';
  activity: 'all' | 'high' | 'medium' | 'low' | 'inactive';
}

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Table configuration
  displayedColumns: string[] = [
    'select',
    'avatar',
    'username', 
    'email', 
    'status', 
    'roles',
    'patchCount',
    'lastLoginAt',
    'createdAt',
    'actions'
  ];

  dataSource = new MatTableDataSource<AdminUser>();
  selection = new SelectionModel<AdminUser>(true, []);
  
  // Loading and error states
  loading = false;
  error: string | null = null;
  totalUsers = 0;
  lastUpdated = new Date();
  
  // Search and filters
  searchControl = new FormControl('');
  filters: UserListFilters = {
    status: 'all',
    role: '',
    dateRange: 'all',
    activity: 'all'
  };

  // Filter options
  statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'banned', label: 'Banned' },
    { value: 'pending', label: 'Pending Verification' }
  ];

  roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'admin', label: 'Administrator' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'user', label: 'User' },
    { value: 'premium', label: 'Premium User' }
  ];

  dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  activityOptions = [
    { value: 'all', label: 'All Activity Levels' },
    { value: 'high', label: 'High Activity' },
    { value: 'medium', label: 'Medium Activity' },
    { value: 'low', label: 'Low Activity' },
    { value: 'inactive', label: 'Inactive' }
  ];

  // Bulk operations
  availableBulkOperations = [
    { value: 'activate', label: 'Activate Users', icon: 'check_circle', color: 'primary' },
    { value: 'suspend', label: 'Suspend Users', icon: 'block', color: 'warn' },
    { value: 'delete', label: 'Delete Users', icon: 'delete', color: 'warn' },
    { value: 'export', label: 'Export Data', icon: 'download', color: 'accent' },
    { value: 'assign_role', label: 'Assign Role', icon: 'person_add', color: 'primary' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private adminApi: AdminApiService,
    private logger: AdminLoggerService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.setupSearch();
    this.loadUsers();
    
    this.logger.logAdminAction('user_list_viewed', {
      timestamp: new Date().toISOString()
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    // Combine search and filter changes
    combineLatest([
      this.searchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged()
      ),
      // We'll add filter observables here when we implement the filter component
    ]).pipe(
      takeUntil(this.destroy$),
      switchMap(() => this.loadUsersWithFilters())
    ).subscribe();
  }

  private loadUsersWithFilters(): Observable<{ users: AdminUser[], total: number }> {
    this.loading = true;
    this.error = null;

    const params = {
      search: this.searchControl.value || '',
      sortBy: this.sort?.active as 'username' | 'created_at' | 'patch_count' | undefined,
      sortOrder: this.sort?.direction as 'asc' | 'desc' | undefined,
      limit: this.paginator?.pageSize || 25,
      offset: this.paginator ? (this.paginator.pageIndex * this.paginator.pageSize) : 0
    };

    return this.adminApi.getUsers(params).pipe(
      catchError(error => {
        this.error = 'Failed to load users. Please try again.';
        this.loading = false;
        this.logger.logError(error, 'UserListComponent', { action: 'loadUsers' });
        return of({ users: [], total: 0 });
      })
    );
  }

  loadUsers(): void {
    this.loadUsersWithFilters().subscribe({
      next: (result) => {
        this.dataSource.data = result.users;
        this.totalUsers = result.total;
        this.loading = false;
        this.selection.clear();
        this.lastUpdated = new Date();
      },
      error: (error) => {
        this.error = 'Failed to load users. Please try again.';
        this.loading = false;
        this.logger.logError(error, 'UserListComponent', { action: 'loadUsers' });
      }
    });
  }

  onSortChange(sort: Sort): void {
    this.loadUsers();
    this.logger.logAdminAction('user_list_sorted', {
      sortBy: sort.active,
      direction: sort.direction
    });
  }

  onPageChange(): void {
    this.loadUsers();
    this.logger.logAdminAction('user_list_paged', {
      page: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize
    });
  }

  onRefresh(): void {
    this.loadUsers();
    this.logger.logAdminAction('user_list_refreshed', {
      timestamp: new Date().toISOString()
    });
  }

  onFilterChange(): void {
    this.paginator.firstPage();
    this.loadUsers();
    this.logger.logAdminAction('user_list_filtered', {
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
    
    this.logger.logAdminAction('user_list_selection_toggled', {
      selectedCount: this.selection.selected.length,
      totalCount: this.dataSource.data.length
    });
  }

  toggleSelection(user: AdminUser): void {
    this.selection.toggle(user);
    
    this.logger.logAdminAction('user_selection_toggled', {
      userId: user.id,
      username: user.username,
      selected: this.selection.isSelected(user)
    });
  }

  // Bulk operations
  onBulkOperation(operation: string): void {
    const selectedUsers = this.selection.selected;
    
    if (selectedUsers.length === 0) {
      return;
    }

    switch (operation) {
      case 'activate':
        this.bulkActivateUsers(selectedUsers);
        break;
      case 'suspend':
        this.bulkSuspendUsers(selectedUsers);
        break;
      case 'delete':
        this.bulkDeleteUsers(selectedUsers);
        break;
      case 'export':
        this.exportSelectedUsers(selectedUsers);
        break;
      case 'assign_role':
        this.openRoleAssignmentDialog(selectedUsers);
        break;
    }
  }

  private bulkActivateUsers(users: AdminUser[]): void {
    this.loading = true;
    
    // For now, we'll call the moderate endpoint for each user
    // In a real implementation, we'd have a proper bulk endpoint
    const operations = users.map(user => 
      this.adminApi.moderateUser(user.id, 'activate', 'Bulk activation')
    );

    // Execute all operations
    Promise.all(operations.map(op => op.toPromise()))
      .then(results => {
        this.loading = false;
        this.selection.clear();
        this.loadUsers();
        
        const successCount = results.filter(r => r?.success).length;
        this.logger.logAdminAction('bulk_user_activation', {
          totalUsers: users.length,
          successCount: successCount,
          userIds: users.map(u => u.id)
        });
      })
      .catch(error => {
        this.loading = false;
        this.error = 'Bulk activation failed. Please try again.';
        this.logger.logError(error, 'UserListComponent', { action: 'bulkActivateUsers' });
      });
  }

  private bulkSuspendUsers(users: AdminUser[]): void {
    this.loading = true;
    
    const operations = users.map(user => 
      this.adminApi.moderateUser(user.id, 'suspend', 'Bulk suspension')
    );

    Promise.all(operations.map(op => op.toPromise()))
      .then(results => {
        this.loading = false;
        this.selection.clear();
        this.loadUsers();
        
        const successCount = results.filter(r => r?.success).length;
        this.logger.logAdminAction('bulk_user_suspension', {
          totalUsers: users.length,
          successCount: successCount,
          userIds: users.map(u => u.id)
        });
      })
      .catch(error => {
        this.loading = false;
        this.error = 'Bulk suspension failed. Please try again.';
        this.logger.logError(error, 'UserListComponent', { action: 'bulkSuspendUsers' });
      });
  }

  private bulkDeleteUsers(users: AdminUser[]): void {
    // Implementation would go here - requires confirmation dialog
    this.logger.logAdminAction('bulk_user_deletion_attempted', {
      userCount: users.length
    });
  }

  private exportSelectedUsers(users: AdminUser[]): void {
    // Implementation would go here - export selected users
    this.logger.logAdminAction('user_export_requested', {
      userCount: users.length,
      userIds: users.map(u => u.id)
    });
  }

  private openRoleAssignmentDialog(users: AdminUser[]): void {
    // Implementation would go here - open role assignment dialog
    this.logger.logAdminAction('role_assignment_dialog_opened', {
      userCount: users.length
    });
  }

  // Individual user actions
  onEditUser(user: AdminUser): void {
    // Navigate to edit component
    this.logger.logAdminAction('user_edit_requested', {
      userId: user.id,
      username: user.username
    });
  }

  onSuspendUser(user: AdminUser): void {
    this.adminApi.moderateUser(user.id, 'suspend', 'Individual suspension').subscribe({
      next: (result) => {
        if (result.success) {
          this.loadUsers();
          this.logger.logAdminAction('user_suspended', {
            userId: user.id,
            username: user.username
          });
        }
      },
      error: (error) => {
        this.error = 'Failed to suspend user. Please try again.';
        this.logger.logError(error, 'UserListComponent', { 
          action: 'suspendUser',
          userId: user.id 
        });
      }
    });
  }

  onActivateUser(user: AdminUser): void {
    this.adminApi.moderateUser(user.id, 'activate', 'Individual activation').subscribe({
      next: (result) => {
        if (result.success) {
          this.loadUsers();
          this.logger.logAdminAction('user_activated', {
            userId: user.id,
            username: user.username
          });
        }
      },
      error: (error) => {
        this.error = 'Failed to activate user. Please try again.';
        this.logger.logError(error, 'UserListComponent', { 
          action: 'activateUser',
          userId: user.id 
        });
      }
    });
  }

  // Utility methods
  getUserStatus(user: AdminUser): string {
    if (!user.isActive) return 'suspended';
    // Add more status logic based on user properties
    return 'active';
  }

  getUserStatusColor(user: AdminUser): string {
    const status = this.getUserStatus(user);
    switch (status) {
      case 'active': return 'primary';
      case 'suspended': return 'warn';
      case 'banned': return 'warn';
      case 'pending': return 'accent';
      default: return 'primary';
    }
  }

  getRoleDisplayText(roles: string[]): string {
    if (!roles || roles.length === 0) return 'User';
    return roles.join(', ');
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  }

  getActivityLevel(user: AdminUser): string {
    // Simple activity calculation based on patch count and last login
    if (user.patchCount > 10) return 'High';
    if (user.patchCount > 3) return 'Medium';
    if (user.patchCount > 0) return 'Low';
    return 'Inactive';
  }

  trackByUserId(index: number, user: AdminUser): number {
    return user.id;
  }
}