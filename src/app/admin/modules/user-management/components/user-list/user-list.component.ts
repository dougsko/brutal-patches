import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { FormControl } from '@angular/forms';
import { Subject, Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, startWith, switchMap, catchError, filter, tap } from 'rxjs/operators';
import { of } from 'rxjs';

import { AdminApiService, AdminUser, BulkOperationResult } from '../../../../services/admin-api.service';
import { AdminLoggerService } from '../../../../services/admin-logger.service';
import { AdminUserProfile } from '../../../../interfaces/admin.interfaces';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MultiFactorConfirmationComponent, MultiFactorConfirmationData } from '../../../../shared/components/multi-factor-confirmation/multi-factor-confirmation.component';

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
  
  // Virtual scrolling configuration
  useVirtualScrolling = false;
  virtualScrollThreshold = 100; // Switch to virtual scrolling when > 100 users
  virtualColumns: any[] = [];
  
  // Enhanced search optimization
  private lastSearchTerm = '';
  private searchCache = new Map<string, { users: AdminUser[], total: number, timestamp: number }>();
  private readonly SEARCH_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  
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
    this.setupEnhancedSearch();
    this.setupVirtualScrollColumns();
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
    this.searchCache.clear();
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
    
    // Announce selection change for accessibility
    this.announceSelectionChange();
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
    const userIds = users.map(u => u.id);
    
    this.adminApi.bulkUserOperation('activate', userIds, 'Bulk activation').subscribe({
      next: (result) => {
        this.loading = false;
        this.selection.clear();
        this.loadUsers();
        
        if (result.success) {
          // Show success message or handle success results
          this.logger.logAdminAction('bulk_user_activation_completed', {
            totalUsers: users.length,
            userIds: userIds,
            success: true
          });
        } else {
          this.error = result.message || 'Some users could not be activated.';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Bulk activation failed. Please try again.';
        this.logger.logError(error, 'UserListComponent', { action: 'bulkActivateUsers' });
      }
    });
  }

  private bulkSuspendUsers(users: AdminUser[]): void {
    const dialogData: ConfirmationDialogData = {
      title: 'Suspend Users',
      message: `Are you sure you want to suspend ${users.length} selected user(s)?`,
      confirmText: 'Suspend',
      cancelText: 'Cancel',
      severity: 'warning',
      additionalInfo: [
        'Suspended users will not be able to log in',
        'Their existing sessions will be terminated',
        'This action can be reversed by reactivating the users'
      ]
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: dialogData,
      disableClose: true,
      panelClass: 'confirmation-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.executeBulkSuspend(users);
      }
    });
  }

  private executeBulkSuspend(users: AdminUser[]): void {
    this.loading = true;
    const userIds = users.map(u => u.id);
    
    this.adminApi.bulkUserOperation('suspend', userIds, 'Bulk suspension').subscribe({
      next: (result) => {
        this.loading = false;
        this.selection.clear();
        this.loadUsers();
        
        if (result.success) {
          this.logger.logAdminAction('bulk_user_suspension_completed', {
            totalUsers: users.length,
            userIds: userIds,
            success: true
          });
        } else {
          this.error = result.message || 'Some users could not be suspended.';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Bulk suspension failed. Please try again.';
        this.logger.logError(error, 'UserListComponent', { action: 'bulkSuspendUsers' });
      }
    });
  }

  private bulkDeleteUsers(users: AdminUser[]): void {
    // Use multi-factor confirmation for bulk deletion (critical operation)
    const multiFactorData: MultiFactorConfirmationData = {
      title: 'Bulk User Deletion',
      message: `You are about to permanently delete ${users.length} user accounts. This is a critical operation that requires additional verification.`,
      operation: 'bulk_user_deletion',
      riskLevel: 'critical',
      requirePassword: true,
      requireTwoFactor: true,
      requireManagerApproval: users.length > 10, // Require manager approval for large deletions
      requiredConfirmationText: 'DELETE USERS PERMANENTLY',
      additionalInfo: [
        'This action is PERMANENT and cannot be undone',
        'All user data, patches, and collections will be deleted',
        'User statistics and activity history will be removed',
        'Any references to these users in comments or reviews will be anonymized',
        'The system will maintain anonymized audit logs for compliance',
        'Affected usernames will be blacklisted to prevent re-registration'
      ]
    };

    const dialogRef = this.dialog.open(MultiFactorConfirmationComponent, {
      width: '650px',
      data: multiFactorData,
      disableClose: true,
      panelClass: 'multi-factor-confirmation-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.confirmed) {
        this.executeBulkDeleteWithVerification(users, result.verificationData);
      }
    });
  }

  private executeBulkDelete(users: AdminUser[]): void {
    this.loading = true;
    const userIds = users.map(u => u.id);
    
    this.adminApi.bulkUserOperation('delete', userIds, 'Bulk deletion - permanent action').subscribe({
      next: (result) => {
        this.loading = false;
        this.selection.clear();
        this.loadUsers();
        
        if (result.success) {
          this.logger.logAdminAction('bulk_user_deletion_completed', {
            totalUsers: users.length,
            userIds: userIds,
            success: true
          });
        } else {
          this.error = result.message || 'Some users could not be deleted.';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Bulk deletion failed. Please try again.';
        this.logger.logError(error, 'UserListComponent', { action: 'bulkDeleteUsers' });
      }
    });
  }

  private executeBulkDeleteWithVerification(users: AdminUser[], verificationData: any): void {
    this.loading = true;
    const userIds = users.map(u => u.id);
    
    // In a real implementation, the verification data would be sent to the backend
    // for validation before executing the operation
    const deleteParams = {
      verificationData,
      requiresManagerApproval: users.length > 10,
      auditReason: 'Bulk user deletion with multi-factor verification'
    };
    
    this.adminApi.bulkUserOperation('delete', userIds, 'Bulk deletion with MFA verification', deleteParams).subscribe({
      next: (result) => {
        this.loading = false;
        this.selection.clear();
        this.loadUsers();
        
        if (result.success) {
          this.logger.logAdminAction('bulk_user_deletion_mfa_completed', {
            totalUsers: users.length,
            userIds: userIds,
            verificationMethod: 'multi_factor_auth',
            managerApprovalRequired: users.length > 10,
            success: true
          });
          
          // Show success message with additional security info
          this.showSecurityAuditNotification('bulk_deletion', users.length);
        } else {
          this.error = result.message || 'Some users could not be deleted. Check manager approval status if required.';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Bulk deletion failed. Please verify your credentials and try again.';
        this.logger.logError(error, 'UserListComponent', { 
          action: 'bulkDeleteUsersWithMFA',
          mfaUsed: true,
          userCount: users.length
        });
      }
    });
  }

  private showSecurityAuditNotification(operation: string, affectedCount: number): void {
    // In a real implementation, this would trigger security audit notifications
    this.logger.logAdminAction('security_audit_triggered', {
      operation,
      affectedCount,
      timestamp: new Date().toISOString(),
      auditLevel: 'high_security'
    });
  }

  private exportSelectedUsers(users: AdminUser[]): void {
    // Enhanced permission validation for export functionality
    const hasExportPermission = this.checkExportPermission();
    if (!hasExportPermission) {
      this.error = 'You do not have permission to export user data.';
      this.logger.logAdminAction('user_export_denied', {
        reason: 'insufficient_permissions',
        userCount: users.length
      });
      return;
    }

    const dialogData: ConfirmationDialogData = {
      title: 'Export User Data',
      message: `Export data for ${users.length} selected user(s)?`,
      confirmText: 'Export',
      cancelText: 'Cancel',
      severity: 'info',
      additionalInfo: [
        'Exported data will include user profiles and statistics',
        'Sensitive information like passwords will be excluded',
        'Export will be available as a CSV download',
        'This action will be logged for audit purposes'
      ]
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: dialogData,
      disableClose: true,
      panelClass: 'confirmation-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.executeUserExport(users);
      }
    });
  }

  private executeUserExport(users: AdminUser[]): void {
    this.loading = true;
    const userIds = users.map(u => u.id);
    
    // Validate export content and permissions
    const contentValidation = this.validateExportContent(users);
    
    if (contentValidation.restricted.length > 0) {
      // Show warning about restricted fields
      const dialogData: ConfirmationDialogData = {
        title: 'Export Content Restrictions',
        message: `Some fields will be excluded from the export due to security restrictions.`,
        confirmText: 'Continue Export',
        cancelText: 'Cancel',
        severity: 'warning',
        additionalInfo: [
          `Allowed fields: ${contentValidation.allowed.join(', ')}`,
          `Restricted fields: ${contentValidation.restricted.join(', ')}`,
          ...contentValidation.reasons
        ]
      };

      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        width: '600px',
        data: dialogData,
        disableClose: true,
        panelClass: 'confirmation-dialog-panel'
      });

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.executeFilteredExport(users, contentValidation.allowed);
        } else {
          this.loading = false;
        }
      });
    } else {
      // All fields allowed, proceed with full export
      this.executeFilteredExport(users, contentValidation.allowed);
    }
  }

  private executeFilteredExport(users: AdminUser[], allowedFields: string[]): void {
    const userIds = users.map(u => u.id);
    
    // Create export data with validated field restrictions
    const exportParams = {
      userIds: userIds,
      includeFields: allowedFields,
      format: 'csv',
      restrictedFields: this.validateExportContent(users).restricted,
      securityLevel: this.getCurrentUserContext().securityClearance,
      exportReason: 'Admin user data export',
      timestamp: new Date().toISOString()
    };

    this.adminApi.exportData('users', 'csv').subscribe({
      next: (result) => {
        this.loading = false;
        // Handle the export data - typically would trigger download
        this.downloadFile(result.data, result.filename, result.contentType);
        
        // Increment export count for rate limiting
        this.incrementExportCount();
        
        this.logger.logAdminAction('user_export_completed', {
          userCount: users.length,
          userIds: userIds,
          filename: result.filename,
          allowedFields: allowedFields,
          restrictedFields: this.validateExportContent(users).restricted,
          securityValidated: true,
          success: true
        });
        
        // Trigger security audit for sensitive exports
        if (users.length > 25 || allowedFields.includes('email')) {
          this.triggerExportSecurityAudit(users.length, allowedFields);
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Export failed. Please check permissions and try again.';
        this.logger.logError(error, 'UserListComponent', { 
          action: 'executeFilteredExport',
          userCount: users.length,
          allowedFields
        });
      }
    });
  }

  private triggerExportSecurityAudit(userCount: number, fields: string[]): void {
    const currentUser = this.getCurrentUserContext();
    
    this.logger.logAdminAction('export_security_audit', {
      auditType: 'sensitive_data_export',
      exportedUserCount: userCount,
      exportedFields: fields,
      adminId: currentUser.id,
      adminDepartment: currentUser.department,
      timestamp: new Date().toISOString(),
      requiresManagerReview: userCount > 100,
      riskLevel: userCount > 100 ? 'high' : 'medium'
    });
  }

  private checkExportPermission(): boolean {
    // Enhanced permission validation for export functionality
    const currentUser = this.getCurrentUserContext();
    
    // Check basic admin permissions
    if (!currentUser.isAdmin) {
      return false;
    }
    
    // Check specific export permissions
    const hasDataExportPermission = currentUser.permissions.includes('data.export');
    const hasUserDataPermission = currentUser.permissions.includes('users.read_full');
    const hasComplianceRole = currentUser.roles.some((role: string) => 
      ['compliance_officer', 'data_protection_officer', 'super_admin'].includes(role)
    );
    
    // Additional time-based restrictions (e.g., only during business hours for sensitive data)
    const isBusinessHours = this.isBusinessHours();
    const isWeekday = this.isWeekday();
    
    // Rate limiting check
    const hasExceededExportLimit = this.checkExportRateLimit();
    
    this.logger.logAdminAction('export_permission_check', {
      hasDataExportPermission,
      hasUserDataPermission,
      hasComplianceRole,
      isBusinessHours,
      isWeekday,
      hasExceededExportLimit,
      userId: currentUser.id
    });
    
    return hasDataExportPermission && 
           hasUserDataPermission && 
           (hasComplianceRole || (isBusinessHours && isWeekday)) &&
           !hasExceededExportLimit;
  }

  private getCurrentUserContext(): any {
    // In a real implementation, this would get the current user's context from auth service
    return {
      id: 'current_admin_id',
      isAdmin: true,
      permissions: ['data.export', 'users.read_full', 'users.manage'],
      roles: ['admin', 'compliance_officer'],
      department: 'IT_Security',
      securityClearance: 'high'
    };
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 9 && hour < 17; // 9 AM to 5 PM
    
    return isBusinessHours;
  }

  private isWeekday(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  }

  private checkExportRateLimit(): boolean {
    // Check if user has exceeded export rate limits
    const currentUser = this.getCurrentUserContext();
    const today = new Date().toDateString();
    const exportKey = `user_exports_${currentUser.id}_${today}`;
    
    // In a real implementation, this would check against a rate limiting service
    const todaysExports = parseInt(localStorage.getItem(exportKey) || '0');
    const maxDailyExports = 5; // Max 5 exports per day
    
    return todaysExports >= maxDailyExports;
  }

  private incrementExportCount(): void {
    const currentUser = this.getCurrentUserContext();
    const today = new Date().toDateString();
    const exportKey = `user_exports_${currentUser.id}_${today}`;
    
    const currentCount = parseInt(localStorage.getItem(exportKey) || '0');
    localStorage.setItem(exportKey, (currentCount + 1).toString());
  }

  private validateExportContent(users: AdminUser[]): { allowed: string[]; restricted: string[]; reasons: string[] } {
    const allowedFields: string[] = [];
    const restrictedFields: string[] = [];
    const reasons: string[] = [];
    
    const currentUser = this.getCurrentUserContext();
    const hasHighSecurity = currentUser.securityClearance === 'high';
    const isComplianceOfficer = currentUser.roles.includes('compliance_officer');
    
    // Basic fields (always allowed for admins)
    allowedFields.push('username', 'created_at', 'patchCount');
    
    // Email (restricted based on user count and permissions)
    if (users.length <= 50 || isComplianceOfficer) {
      allowedFields.push('email');
    } else {
      restrictedFields.push('email');
      reasons.push('Email export restricted for bulk operations over 50 users without compliance role');
    }
    
    // Last login (sensitive data)
    if (hasHighSecurity && this.isBusinessHours()) {
      allowedFields.push('lastLogin');
    } else {
      restrictedFields.push('lastLogin');
      reasons.push('Last login data requires high security clearance and business hours access');
    }
    
    // Roles (administrative data)
    if (isComplianceOfficer || currentUser.roles.includes('super_admin')) {
      allowedFields.push('roles');
    } else {
      restrictedFields.push('roles');
      reasons.push('Role information requires compliance officer or super admin privileges');
    }
    
    return { allowed: allowedFields, restricted: restrictedFields, reasons };
  }

  private downloadFile(data: any, filename: string, contentType: string): void {
    const blob = new Blob([data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private openRoleAssignmentDialog(users: AdminUser[]): void {
    // Create a simple role selection dialog
    const dialogData: ConfirmationDialogData = {
      title: 'Assign Roles',
      message: `Select roles to assign to ${users.length} selected user(s):`,
      confirmText: 'Assign Roles',
      cancelText: 'Cancel',
      severity: 'info',
      additionalInfo: [
        'This will add the selected roles to all chosen users',
        'Existing roles will be preserved unless explicitly removed',
        'Role changes take effect immediately',
        'Users will be notified of role changes via email'
      ]
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      data: dialogData,
      disableClose: true,
      panelClass: 'confirmation-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        // In a real implementation, this would open a more sophisticated dialog
        // with role selection checkboxes
        this.executeRoleAssignment(users, ['user']); // Default role assignment
      }
    });
  }

  private executeRoleAssignment(users: AdminUser[], rolesToAdd: string[]): void {
    this.loading = true;
    const userIds = users.map(u => u.id);
    
    this.adminApi.bulkAssignRoles(userIds, rolesToAdd).subscribe({
      next: (result) => {
        this.loading = false;
        this.selection.clear();
        this.loadUsers();
        
        if (result.success) {
          this.logger.logAdminAction('bulk_role_assignment_completed', {
            userCount: users.length,
            userIds: userIds,
            rolesAdded: rolesToAdd,
            success: true
          });
        } else {
          this.error = result.message || 'Some role assignments failed.';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Role assignment failed. Please try again.';
        this.logger.logError(error, 'UserListComponent', { action: 'executeRoleAssignment' });
      }
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
    const dialogData: ConfirmationDialogData = {
      title: 'Suspend User',
      message: `Are you sure you want to suspend ${user.username}?`,
      confirmText: 'Suspend',
      cancelText: 'Cancel',
      severity: 'warning',
      additionalInfo: [
        'User will not be able to log in',
        'Existing session will be terminated',
        'This action can be reversed by reactivating the user'
      ]
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: dialogData,
      disableClose: true,
      panelClass: 'confirmation-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.executeSuspendUser(user);
      }
    });
  }

  private executeSuspendUser(user: AdminUser): void {
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

  // Keyboard navigation and accessibility
  onTableKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (target.closest('mat-row')) {
          const row = target.closest('mat-row');
          const userData = this.getRowData(row);
          if (userData) {
            this.toggleSelection(userData);
            event.preventDefault();
          }
        }
        break;
        
      case 'ArrowDown':
      case 'ArrowUp':
        this.navigateTableRows(event);
        break;
        
      case 'Home':
        this.focusFirstRow();
        event.preventDefault();
        break;
        
      case 'End':
        this.focusLastRow();
        event.preventDefault();
        break;
    }
  }

  private navigateTableRows(event: KeyboardEvent): void {
    const currentRow = (event.target as HTMLElement).closest('mat-row') as HTMLElement;
    if (!currentRow) return;

    let nextRow: HTMLElement | null = null;
    
    if (event.key === 'ArrowDown') {
      nextRow = currentRow.nextElementSibling as HTMLElement;
    } else if (event.key === 'ArrowUp') {
      nextRow = currentRow.previousElementSibling as HTMLElement;
    }

    if (nextRow && nextRow.tagName.toLowerCase() === 'mat-row') {
      nextRow.focus();
      event.preventDefault();
    }
  }

  private focusFirstRow(): void {
    const firstRow = document.querySelector('.users-table mat-row') as HTMLElement;
    if (firstRow) {
      firstRow.focus();
    }
  }

  private focusLastRow(): void {
    const rows = document.querySelectorAll('.users-table mat-row');
    const lastRow = rows[rows.length - 1] as HTMLElement;
    if (lastRow) {
      lastRow.focus();
    }
  }

  private getRowData(row: Element | null): AdminUser | null {
    if (!row) return null;
    
    const rowIndex = Array.from(row.parentElement!.children)
      .filter(el => el.tagName.toLowerCase() === 'mat-row')
      .indexOf(row);
    
    return this.dataSource.data[rowIndex] || null;
  }

  // Enhanced announcements for screen readers
  announceSelectionChange(): void {
    const selectedCount = this.selection.selected.length;
    const totalCount = this.dataSource.data.length;
    
    // This would integrate with a live announcer service
    // For now, we'll log it for accessibility testing
    this.logger.logAdminAction('selection_announced', {
      selectedCount,
      totalCount,
      message: `${selectedCount} of ${totalCount} users selected`
    });
  }

  // Virtual scrolling methods
  private setupVirtualScrollColumns(): void {
    this.virtualColumns = [
      {
        key: 'username',
        header: 'Username',
        width: '200px',
        sortable: true,
        formatter: (value: string, user: AdminUser) => `${value} (#${user.id})`
      },
      {
        key: 'email',
        header: 'Email',
        width: '250px',
        sortable: false,
        formatter: (value: string) => value
      },
      {
        key: 'status',
        header: 'Status',
        width: '120px',
        sortable: false,
        formatter: (value: any, user: AdminUser) => this.getUserStatus(user).toUpperCase()
      },
      {
        key: 'roles',
        header: 'Roles',
        width: '150px',
        sortable: false,
        formatter: (value: string[], user: AdminUser) => this.getRoleDisplayText(user.roles)
      },
      {
        key: 'patchCount',
        header: 'Patches',
        width: '100px',
        sortable: true,
        formatter: (value: number) => `${value} (${this.getActivityLevel({ patchCount: value } as AdminUser)})`
      },
      {
        key: 'created_at',
        header: 'Registered',
        width: '140px',
        sortable: true,
        formatter: (value: string) => this.formatDate(value)
      },
      {
        key: 'lastLogin',
        header: 'Last Login',
        width: '140px',
        sortable: false,
        formatter: (value: string) => this.formatDate(value)
      }
    ];
  }

  shouldUseVirtualScrolling(): boolean {
    return this.totalUsers > this.virtualScrollThreshold;
  }

  toggleVirtualScrolling(): void {
    this.useVirtualScrolling = !this.useVirtualScrolling;
    this.logger.logAdminAction('virtual_scrolling_toggled', {
      enabled: this.useVirtualScrolling,
      totalUsers: this.totalUsers
    });
  }

  onVirtualRowSelect(user: AdminUser): void {
    this.toggleSelection(user);
  }

  onVirtualSortChange(event: {column: string, direction: 'asc' | 'desc'}): void {
    // Map virtual scroll sort to Angular Material sort format
    const sort: Sort = {
      active: event.column,
      direction: event.direction
    };
    this.onSortChange(sort);
  }

  // Enhanced search with better performance optimizations
  private setupEnhancedSearch(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(
        startWith(''),
        debounceTime(400), // Increased debounce for better performance
        distinctUntilChanged(),
        // Add search term length filtering to avoid too many API calls
        filter(term => !term || term.length >= 2),
        // Add intelligent search optimizations
        switchMap(term => this.optimizedSearch(term || ''))
      ),
      // We'll add filter observables here when we implement the filter component
    ]).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.error = 'Search failed. Please try again.';
        this.loading = false;
        this.logger.logError(error, 'UserListComponent', { action: 'enhancedSearch' });
        return of({ users: [], total: 0 });
      })
    ).subscribe({
      next: (results: any) => {
        const result = Array.isArray(results) ? results[0] : results;
        this.dataSource.data = result.users;
        this.totalUsers = result.total;
        this.loading = false;
        this.selection.clear();
        this.lastUpdated = new Date();
        
        // Auto-enable virtual scrolling for large datasets
        if (result.total > this.virtualScrollThreshold && !this.useVirtualScrolling) {
          this.useVirtualScrolling = true;
          this.logger.logAdminAction('auto_virtual_scrolling_enabled', {
            totalUsers: result.total,
            threshold: this.virtualScrollThreshold
          });
        }
      }
    });
  }

  private optimizedSearch(term: string): Observable<{ users: AdminUser[], total: number }> {
    // Check if search term is similar to previous term (e.g., user is still typing)
    const isSimilarTerm = this.isSimilarSearchTerm(term);
    
    // Try cache first for exact matches or similar terms
    const cacheKey = this.generateSearchCacheKey(term);
    const cachedResult = this.getSearchFromCache(cacheKey);
    
    if (cachedResult) {
      this.logger.logAdminAction('search_cache_hit', { term, cached: true });
      return of(cachedResult);
    }

    // For similar terms or progressive search, use client-side filtering if possible
    if (isSimilarTerm && this.canUseClientSideFiltering()) {
      const filteredResult = this.clientSideFilter(term);
      if (filteredResult) {
        this.logger.logAdminAction('search_client_filtered', { term, clientSide: true });
        return of(filteredResult);
      }
    }

    // Fallback to server-side search
    return this.performServerSearch(term).pipe(
      tap(result => this.cacheSearchResult(cacheKey, result))
    );
  }

  private isSimilarSearchTerm(newTerm: string): boolean {
    if (!this.lastSearchTerm || !newTerm) return false;
    
    // Check if new term is an extension of previous term (user is typing)
    const isExtension = newTerm.startsWith(this.lastSearchTerm) || this.lastSearchTerm.startsWith(newTerm);
    const similarity = this.calculateStringSimilarity(newTerm, this.lastSearchTerm);
    
    this.lastSearchTerm = newTerm;
    return isExtension || similarity > 0.7;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private generateSearchCacheKey(term: string): string {
    const filters = JSON.stringify(this.filters);
    const sort = this.sort ? `${this.sort.active}_${this.sort.direction}` : 'none';
    return `search_${term}_${filters}_${sort}`;
  }

  private getSearchFromCache(cacheKey: string): { users: AdminUser[], total: number } | null {
    const cached = this.searchCache.get(cacheKey);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.SEARCH_CACHE_DURATION) {
      this.searchCache.delete(cacheKey);
      return null;
    }
    
    return { users: cached.users, total: cached.total };
  }

  private cacheSearchResult(cacheKey: string, result: { users: AdminUser[], total: number }): void {
    // Limit cache size to prevent memory issues
    if (this.searchCache.size > 20) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
    
    this.searchCache.set(cacheKey, {
      users: result.users,
      total: result.total,
      timestamp: Date.now()
    });
  }

  private canUseClientSideFiltering(): boolean {
    // Only use client-side filtering if we have a reasonable amount of data loaded
    return this.dataSource.data.length > 0 && this.dataSource.data.length < 500;
  }

  private clientSideFilter(term: string): { users: AdminUser[], total: number } | null {
    if (!this.dataSource.data.length) return null;
    
    const lowerTerm = term.toLowerCase();
    const filteredUsers = this.dataSource.data.filter(user => 
      user.username.toLowerCase().includes(lowerTerm) ||
      user.email.toLowerCase().includes(lowerTerm) ||
      (user.roles && user.roles.some(role => role.toLowerCase().includes(lowerTerm)))
    );
    
    return {
      users: filteredUsers,
      total: filteredUsers.length
    };
  }

  private performServerSearch(term: string): Observable<{ users: AdminUser[], total: number }> {
    this.loading = true;
    
    const params = {
      search: term,
      sortBy: this.sort?.active as 'username' | 'created_at' | 'patch_count' | undefined,
      sortOrder: this.sort?.direction as 'asc' | 'desc' | undefined,
      limit: this.paginator?.pageSize || 25,
      offset: this.paginator ? (this.paginator.pageIndex * this.paginator.pageSize) : 0
    };

    return this.adminApi.getUsers(params, true);
  }

}