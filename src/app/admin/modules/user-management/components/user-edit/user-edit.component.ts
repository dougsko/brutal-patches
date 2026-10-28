import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { AdminApiService, AdminUser, BulkOperationResult } from '../../../../services/admin-api.service';
import { AdminLoggerService } from '../../../../services/admin-logger.service';
import { 
  AdminUserProfile, 
  UserRole, 
  Permission, 
  SuspensionRecord, 
  AdminNote 
} from '../../../../interfaces/admin.interfaces';

interface UserEditForm {
  personalInfo: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  status: {
    active: boolean;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
  };
  roles: string[];
  permissions: string[];
}

@Component({
  selector: 'app-user-edit',
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.scss']
})
export class UserEditComponent implements OnInit, OnDestroy {
  userId: number | null = null;
  user: AdminUserProfile | null = null;
  userForm: FormGroup;
  
  loading = false;
  saving = false;
  error: string | null = null;
  hasUnsavedChanges = false;
  
  // Form sections
  activeTab = 0;
  tabLabels = [
    'Profile',
    'Roles & Permissions',
    'Activity & Statistics',
    'Moderation History',
    'Admin Notes'
  ];

  // Role and Permission data
  availableRoles: UserRole[] = [];
  availablePermissions: Permission[] = [];
  selectedRoles: string[] = [];
  
  // Activity data
  userStatistics = {
    totalPatches: 0,
    totalCollections: 0,
    totalViews: 0,
    totalDownloads: 0,
    averageRating: 0,
    registrationDate: '',
    lastLoginDate: '',
    loginCount: 0
  };
  
  // Moderation data
  suspensionHistory: SuspensionRecord[] = [];
  adminNotes: AdminNote[] = [];
  
  // New note form
  newNoteForm: FormGroup;
  addingNote = false;
  
  // Suspension form
  suspensionForm: FormGroup;
  showSuspensionForm = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private adminApi: AdminApiService,
    private logger: AdminLoggerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const id = params['id'];
      if (id && !isNaN(+id)) {
        this.userId = +id;
        this.loadUserData();
      } else {
        this.error = 'Invalid user ID';
        this.logger.logError(
          new Error('Invalid user ID in route'),
          'UserEditComponent',
          { providedId: id }
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Main user form
    this.userForm = this.formBuilder.group({
      personalInfo: this.formBuilder.group({
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        firstName: [''],
        lastName: ['']
      }),
      status: this.formBuilder.group({
        active: [true],
        emailVerified: [false],
        twoFactorEnabled: [false]
      }),
      roles: this.formBuilder.array([]),
      permissions: this.formBuilder.array([])
    });

    // New note form
    this.newNoteForm = this.formBuilder.group({
      content: ['', [Validators.required, Validators.minLength(10)]],
      type: ['general', Validators.required],
      isVisible: [true]
    });

    // Suspension form
    this.suspensionForm = this.formBuilder.group({
      reason: ['', [Validators.required, Validators.minLength(10)]],
      duration: ['permanent'],
      customDuration: [''],
      notifyUser: [true],
      notes: ['']
    });

    // Track form changes
    this.userForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.hasUnsavedChanges = this.userForm.dirty;
    });
  }

  loadUserData(): void {
    if (!this.userId) return;

    this.loading = true;
    this.error = null;

    // In a real implementation, we'd have dedicated endpoints for detailed user data
    // For now, we'll use the existing getUsers endpoint and mock additional data
    this.adminApi.getUsers({ search: this.userId.toString() }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.error = 'Failed to load user data';
        this.loading = false;
        this.logger.logError(error, 'UserEditComponent', { 
          action: 'loadUserData',
          userId: this.userId 
        });
        return of({ users: [], total: 0 });
      })
    ).subscribe(result => {
      const foundUser = result.users.find(u => u.id === this.userId);
      if (foundUser) {
        this.populateFormWithUser(foundUser);
        this.loadAdditionalUserData();
      } else {
        this.error = 'User not found';
      }
      this.loading = false;
    });
  }

  private populateFormWithUser(user: AdminUser): void {
    // Convert AdminUser to AdminUserProfile (mock additional fields)
    this.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: '',
      lastName: '',
      avatar: '',
      roles: user.roles.map(role => ({ 
        id: role, 
        name: role, 
        permissions: [], 
        isDefault: false, 
        createdAt: '' 
      })),
      status: user.isActive ? 'active' : 'suspended',
      createdAt: user.created_at,
      updatedAt: '',
      lastLoginAt: user.lastLogin,
      loginCount: 0,
      emailVerified: true,
      twoFactorEnabled: false,
      patchCount: user.patchCount,
      collectionCount: 0,
      averagePatchRating: 0,
      totalViews: 0,
      totalDownloads: 0,
      warningCount: 0,
      suspensionHistory: [],
      notes: []
    };

    // Populate form
    this.userForm.patchValue({
      personalInfo: {
        username: user.username,
        email: user.email,
        firstName: this.user.firstName || '',
        lastName: this.user.lastName || ''
      },
      status: {
        active: user.isActive,
        emailVerified: this.user.emailVerified,
        twoFactorEnabled: this.user.twoFactorEnabled
      }
    });

    this.selectedRoles = user.roles;
    this.updateRoleFormArray();
    
    // Update statistics
    this.userStatistics = {
      totalPatches: user.patchCount,
      totalCollections: this.user.collectionCount,
      totalViews: this.user.totalViews,
      totalDownloads: this.user.totalDownloads,
      averageRating: this.user.averagePatchRating,
      registrationDate: user.created_at,
      lastLoginDate: user.lastLogin || '',
      loginCount: this.user.loginCount
    };
  }

  private loadAdditionalUserData(): void {
    // Mock additional data - in real implementation, these would be separate API calls
    this.availableRoles = [
      {
        id: 'admin',
        name: 'Administrator',
        permissions: [],
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'moderator',
        name: 'Moderator',
        permissions: [],
        isDefault: false,
        createdAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'user',
        name: 'User',
        permissions: [],
        isDefault: true,
        createdAt: '2024-01-01T00:00:00Z'
      }
    ];

    this.availablePermissions = [
      {
        id: 'patches.create',
        name: 'Create Patches',
        resource: 'patches',
        action: 'create',
        description: 'Ability to create new patches'
      },
      {
        id: 'patches.moderate',
        name: 'Moderate Patches',
        resource: 'patches',
        action: 'moderate',
        description: 'Ability to moderate patch content'
      },
      {
        id: 'users.manage',
        name: 'Manage Users',
        resource: 'users',
        action: 'update',
        description: 'Ability to manage user accounts'
      }
    ];
  }

  private updateRoleFormArray(): void {
    const roleArray = this.userForm.get('roles') as FormArray;
    roleArray.clear();
    
    this.selectedRoles.forEach(role => {
      roleArray.push(this.formBuilder.control(role));
    });
  }

  get personalInfo(): FormGroup {
    return this.userForm.get('personalInfo') as FormGroup;
  }

  get status(): FormGroup {
    return this.userForm.get('status') as FormGroup;
  }

  get roles(): FormArray {
    return this.userForm.get('roles') as FormArray;
  }

  onSaveUser(): void {
    if (this.userForm.invalid || !this.userId) {
      this.markFormGroupTouched(this.userForm);
      return;
    }

    this.saving = true;
    this.error = null;

    const formValue = this.userForm.value;
    
    // In a real implementation, we'd have a proper updateUser endpoint
    // For now, we'll just simulate the save operation
    setTimeout(() => {
      this.saving = false;
      this.hasUnsavedChanges = false;
      this.userForm.markAsPristine();
      
      this.snackBar.open('User updated successfully', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      
      this.logger.logAdminAction('user_profile_updated', {
        userId: this.userId,
        username: formValue.personalInfo.username,
        changes: formValue
      });
    }, 1500);
  }

  onResetForm(): void {
    if (this.user) {
      this.populateFormWithUser(this.user as any);
      this.userForm.markAsPristine();
      this.hasUnsavedChanges = false;
      
      this.snackBar.open('Form reset to original values', 'Close', {
        duration: 2000
      });
    }
  }

  onAddRole(role: string): void {
    if (!this.selectedRoles.includes(role)) {
      this.selectedRoles.push(role);
      this.updateRoleFormArray();
      this.userForm.markAsDirty();
      
      this.logger.logAdminAction('user_role_added', {
        userId: this.userId,
        role: role
      });
    }
  }

  onRemoveRole(role: string): void {
    const index = this.selectedRoles.indexOf(role);
    if (index > -1) {
      this.selectedRoles.splice(index, 1);
      this.updateRoleFormArray();
      this.userForm.markAsDirty();
      
      this.logger.logAdminAction('user_role_removed', {
        userId: this.userId,
        role: role
      });
    }
  }

  onSuspendUser(): void {
    this.showSuspensionForm = true;
  }

  onSubmitSuspension(): void {
    if (this.suspensionForm.invalid || !this.userId) {
      this.markFormGroupTouched(this.suspensionForm);
      return;
    }

    const suspensionData = this.suspensionForm.value;
    
    this.adminApi.moderateUser(
      this.userId,
      'suspend',
      suspensionData.reason
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        if (result.success) {
          this.showSuspensionForm = false;
          this.suspensionForm.reset();
          
          this.snackBar.open('User suspended successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          this.logger.logAdminAction('user_suspended', {
            userId: this.userId,
            reason: suspensionData.reason,
            duration: suspensionData.duration
          });
          
          // Reload user data to reflect suspension
          this.loadUserData();
        }
      },
      error: (error) => {
        this.error = 'Failed to suspend user';
        this.logger.logError(error, 'UserEditComponent', {
          action: 'suspendUser',
          userId: this.userId
        });
      }
    });
  }

  onActivateUser(): void {
    if (!this.userId) return;

    this.adminApi.moderateUser(this.userId, 'activate', 'Manual activation').pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        if (result.success) {
          this.snackBar.open('User activated successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          this.logger.logAdminAction('user_activated', {
            userId: this.userId
          });
          
          this.loadUserData();
        }
      },
      error: (error) => {
        this.error = 'Failed to activate user';
        this.logger.logError(error, 'UserEditComponent', {
          action: 'activateUser',
          userId: this.userId
        });
      }
    });
  }

  onAddNote(): void {
    if (this.newNoteForm.invalid) {
      this.markFormGroupTouched(this.newNoteForm);
      return;
    }

    this.addingNote = true;
    const noteData = this.newNoteForm.value;
    
    // Simulate adding note - in real implementation, this would be an API call
    setTimeout(() => {
      const newNote: AdminNote = {
        id: `note-${Date.now()}`,
        content: noteData.content,
        adminUsername: 'current_admin', // Would come from auth service
        createdAt: new Date().toISOString(),
        type: noteData.type,
        isVisible: noteData.isVisible
      };
      
      this.adminNotes.unshift(newNote);
      this.newNoteForm.reset({ type: 'general', isVisible: true });
      this.addingNote = false;
      
      this.snackBar.open('Note added successfully', 'Close', {
        duration: 2000
      });
      
      this.logger.logAdminAction('admin_note_added', {
        userId: this.userId,
        noteType: noteData.type,
        noteLength: noteData.content.length
      });
    }, 1000);
  }

  onDeleteNote(noteId: string): void {
    const index = this.adminNotes.findIndex(note => note.id === noteId);
    if (index > -1) {
      this.adminNotes.splice(index, 1);
      
      this.snackBar.open('Note deleted successfully', 'Close', {
        duration: 2000
      });
      
      this.logger.logAdminAction('admin_note_deleted', {
        userId: this.userId,
        noteId: noteId
      });
    }
  }

  onGoBack(): void {
    if (this.hasUnsavedChanges) {
      // In a real implementation, show confirmation dialog
      const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    
    this.router.navigate(['/admin/users']);
  }

  onTabChange(index: number): void {
    this.activeTab = index;
    this.logger.logAdminAction('user_edit_tab_changed', {
      userId: this.userId,
      tab: this.tabLabels[index],
      tabIndex: index
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched({ onlySelf: true });
      }
    });
  }

  // Utility methods
  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Invalid email format';
      if (field.errors['minlength']) return `${fieldName} is too short`;
    }
    return '';
  }

  formatDate(dateString: string): string {
    return dateString ? new Date(dateString).toLocaleString() : 'Never';
  }

  getRoleDisplayName(roleId: string): string {
    const role = this.availableRoles.find(r => r.id === roleId);
    return role ? role.name : roleId;
  }

  canDeactivate(): boolean {
    return !this.hasUnsavedChanges;
  }
}