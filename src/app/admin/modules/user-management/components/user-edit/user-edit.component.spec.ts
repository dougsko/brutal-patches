import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

// Material Modules
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

import { UserEditComponent } from './user-edit.component';
import { AdminApiService, AdminUser } from '../../../../services/admin-api.service';
import { AdminLoggerService } from '../../../../services/admin-logger.service';

describe('UserEditComponent', () => {
  let component: UserEditComponent;
  let fixture: ComponentFixture<UserEditComponent>;
  let mockAdminApiService: jasmine.SpyObj<AdminApiService>;
  let mockLoggerService: jasmine.SpyObj<AdminLoggerService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockUser: AdminUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    patchCount: 5,
    isActive: true,
    lastLogin: '2024-01-15T12:00:00Z',
    roles: ['user']
  };

  beforeEach(async () => {
    const adminApiSpy = jasmine.createSpyObj('AdminApiService', [
      'getUsers',
      'moderateUser'
    ]);
    const loggerSpy = jasmine.createSpyObj('AdminLoggerService', [
      'logAdminAction',
      'logError'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    mockActivatedRoute = {
      params: of({ id: '1' })
    };

    await TestBed.configureTestingModule({
      declarations: [UserEditComponent],
      imports: [
        BrowserAnimationsModule,
        ReactiveFormsModule,
        MatTabsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatDialogModule
      ],
      providers: [
        FormBuilder,
        { provide: AdminApiService, useValue: adminApiSpy },
        { provide: AdminLoggerService, useValue: loggerSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserEditComponent);
    component = fixture.componentInstance;
    mockAdminApiService = TestBed.inject(AdminApiService) as jasmine.SpyObj<AdminApiService>;
    mockLoggerService = TestBed.inject(AdminLoggerService) as jasmine.SpyObj<AdminLoggerService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
  });

  beforeEach(() => {
    // Setup default mock responses
    mockAdminApiService.getUsers.and.returnValue(of({
      users: [mockUser],
      total: 1
    }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize forms on creation', () => {
    expect(component.userForm).toBeDefined();
    expect(component.newNoteForm).toBeDefined();
    expect(component.suspensionForm).toBeDefined();
  });

  it('should load user data on init with valid ID', () => {
    component.ngOnInit();
    
    expect(component.userId).toBe(1);
    expect(mockAdminApiService.getUsers).toHaveBeenCalledWith({
      search: '1'
    });
  });

  it('should handle invalid user ID', () => {
    mockActivatedRoute.params = of({ id: 'invalid' });
    
    component.ngOnInit();
    
    expect(component.error).toBe('Invalid user ID');
    expect(mockLoggerService.logError).toHaveBeenCalled();
  });

  it('should populate form when user data is loaded', () => {
    component.ngOnInit();
    
    const personalInfo = component.personalInfo;
    expect(personalInfo.get('username')?.value).toBe(mockUser.username);
    expect(personalInfo.get('email')?.value).toBe(mockUser.email);
    
    const status = component.status;
    expect(status.get('active')?.value).toBe(mockUser.isActive);
  });

  it('should handle error when loading user fails', () => {
    mockAdminApiService.getUsers.and.returnValue(throwError(() => new Error('API Error')));
    
    component.ngOnInit();
    
    expect(component.error).toBe('Failed to load user data');
    expect(component.loading).toBeFalse();
    expect(mockLoggerService.logError).toHaveBeenCalled();
  });

  it('should handle user not found', () => {
    mockAdminApiService.getUsers.and.returnValue(of({
      users: [],
      total: 0
    }));
    
    component.ngOnInit();
    
    expect(component.error).toBe('User not found');
    expect(component.loading).toBeFalse();
  });

  describe('Form Management', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should track form changes', () => {
      expect(component.hasUnsavedChanges).toBeFalse();
      
      component.personalInfo.get('username')?.setValue('newusername');
      
      expect(component.hasUnsavedChanges).toBeTrue();
    });

    it('should validate required fields', () => {
      const usernameControl = component.personalInfo.get('username');
      const emailControl = component.personalInfo.get('email');
      
      usernameControl?.setValue('');
      emailControl?.setValue('');
      
      expect(usernameControl?.invalid).toBeTrue();
      expect(emailControl?.invalid).toBeTrue();
    });

    it('should validate email format', () => {
      const emailControl = component.personalInfo.get('email');
      
      emailControl?.setValue('invalid-email');
      expect(emailControl?.invalid).toBeTrue();
      
      emailControl?.setValue('valid@example.com');
      expect(emailControl?.valid).toBeTrue();
    });

    it('should reset form to original values', () => {
      component.personalInfo.get('username')?.setValue('changed');
      component.onResetForm();
      
      expect(component.personalInfo.get('username')?.value).toBe(mockUser.username);
      expect(component.hasUnsavedChanges).toBeFalse();
      expect(mockSnackBar.open).toHaveBeenCalled();
    });
  });

  describe('Save Functionality', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should not save if form is invalid', () => {
      component.personalInfo.get('username')?.setValue('');
      component.onSaveUser();
      
      expect(component.saving).toBeFalse();
    });

    it('should simulate save operation', (done) => {
      component.personalInfo.get('username')?.setValue('newusername');
      component.onSaveUser();
      
      expect(component.saving).toBeTrue();
      
      // Wait for simulated save to complete
      setTimeout(() => {
        expect(component.saving).toBeFalse();
        expect(component.hasUnsavedChanges).toBeFalse();
        expect(mockSnackBar.open).toHaveBeenCalledWith(
          'User updated successfully',
          'Close',
          jasmine.any(Object)
        );
        expect(mockLoggerService.logAdminAction).toHaveBeenCalledWith(
          'user_profile_updated',
          jasmine.any(Object)
        );
        done();
      }, 1600);
    });
  });

  describe('Role Management', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should add role to user', () => {
      const initialRoles = component.selectedRoles.length;
      component.onAddRole('admin');
      
      expect(component.selectedRoles.length).toBe(initialRoles + 1);
      expect(component.selectedRoles).toContain('admin');
      expect(mockLoggerService.logAdminAction).toHaveBeenCalledWith(
        'user_role_added',
        jasmine.objectContaining({ role: 'admin' })
      );
    });

    it('should not add duplicate roles', () => {
      component.selectedRoles = ['user'];
      const initialLength = component.selectedRoles.length;
      
      component.onAddRole('user');
      
      expect(component.selectedRoles.length).toBe(initialLength);
    });

    it('should remove role from user', () => {
      component.selectedRoles = ['user', 'admin'];
      component.onRemoveRole('admin');
      
      expect(component.selectedRoles.length).toBe(1);
      expect(component.selectedRoles).not.toContain('admin');
      expect(mockLoggerService.logAdminAction).toHaveBeenCalledWith(
        'user_role_removed',
        jasmine.objectContaining({ role: 'admin' })
      );
    });

    it('should get role display name', () => {
      component.availableRoles = [
        { id: 'admin', name: 'Administrator', permissions: [], isDefault: false, createdAt: '' }
      ];
      
      expect(component.getRoleDisplayName('admin')).toBe('Administrator');
      expect(component.getRoleDisplayName('unknown')).toBe('unknown');
    });
  });

  describe('User Moderation', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should suspend user successfully', () => {
      const mockResult = { success: true, message: 'User suspended' };
      mockAdminApiService.moderateUser.and.returnValue(of(mockResult));
      spyOn(component, 'loadUserData');
      
      component.suspensionForm.patchValue({
        reason: 'Test suspension reason',
        duration: '1week',
        notifyUser: true
      });
      
      component.onSubmitSuspension();
      
      expect(mockAdminApiService.moderateUser).toHaveBeenCalledWith(
        1, 'suspend', 'Test suspension reason'
      );
      expect(component.showSuspensionForm).toBeFalse();
      expect(component.loadUserData).toHaveBeenCalled();
      expect(mockSnackBar.open).toHaveBeenCalled();
    });

    it('should activate user successfully', () => {
      const mockResult = { success: true, message: 'User activated' };
      mockAdminApiService.moderateUser.and.returnValue(of(mockResult));
      spyOn(component, 'loadUserData');
      
      component.onActivateUser();
      
      expect(mockAdminApiService.moderateUser).toHaveBeenCalledWith(
        1, 'activate', 'Manual activation'
      );
      expect(component.loadUserData).toHaveBeenCalled();
    });

    it('should handle moderation errors', () => {
      mockAdminApiService.moderateUser.and.returnValue(throwError(() => new Error('API Error')));
      
      component.onActivateUser();
      
      expect(component.error).toBe('Failed to activate user');
      expect(mockLoggerService.logError).toHaveBeenCalled();
    });

    it('should not submit suspension with invalid form', () => {
      component.suspensionForm.get('reason')?.setValue('');
      component.onSubmitSuspension();
      
      expect(mockAdminApiService.moderateUser).not.toHaveBeenCalled();
    });
  });

  describe('Notes Management', () => {
    beforeEach(() => {
      component.ngOnInit();
      fixture.detectChanges();
    });

    it('should add new admin note', (done) => {
      component.newNoteForm.patchValue({
        content: 'This is a test note content',
        type: 'general',
        isVisible: true
      });
      
      component.onAddNote();
      
      expect(component.addingNote).toBeTrue();
      
      setTimeout(() => {
        expect(component.adminNotes.length).toBe(1);
        expect(component.adminNotes[0].content).toBe('This is a test note content');
        expect(component.addingNote).toBeFalse();
        expect(mockSnackBar.open).toHaveBeenCalled();
        done();
      }, 1100);
    });

    it('should not add note with invalid form', () => {
      component.newNoteForm.get('content')?.setValue('');
      component.onAddNote();
      
      expect(component.addingNote).toBeFalse();
    });

    it('should delete admin note', () => {
      component.adminNotes = [
        {
          id: 'test-note',
          content: 'Test note',
          adminUsername: 'admin',
          createdAt: '2024-01-01T00:00:00Z',
          type: 'general',
          isVisible: true
        }
      ];
      
      component.onDeleteNote('test-note');
      
      expect(component.adminNotes.length).toBe(0);
      expect(mockSnackBar.open).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should navigate back without confirmation if no changes', () => {
      component.hasUnsavedChanges = false;
      component.onGoBack();
      
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/admin/users']);
    });

    it('should log tab changes', () => {
      component.onTabChange(1);
      
      expect(component.activeTab).toBe(1);
      expect(mockLoggerService.logAdminAction).toHaveBeenCalledWith(
        'user_edit_tab_changed',
        jasmine.objectContaining({ tabIndex: 1 })
      );
    });
  });

  describe('Utility Methods', () => {
    it('should format dates correctly', () => {
      const dateString = '2024-01-15T12:00:00Z';
      const formatted = component.formatDate(dateString);
      
      expect(formatted).toContain('2024');
      expect(component.formatDate('')).toBe('Never');
    });

    it('should get field errors', () => {
      const form = component.personalInfo;
      const field = form.get('username');
      
      field?.setValue('');
      field?.markAsTouched();
      
      const error = component.getFieldError(form, 'username');
      expect(error).toBe('username is required');
    });

    it('should check if component can deactivate', () => {
      component.hasUnsavedChanges = false;
      expect(component.canDeactivate()).toBeTrue();
      
      component.hasUnsavedChanges = true;
      expect(component.canDeactivate()).toBeFalse();
    });
  });

  describe('Component Lifecycle', () => {
    it('should setup route subscription on init', () => {
      spyOn(component, 'loadUserData');
      
      component.ngOnInit();
      
      expect(component.userId).toBe(1);
      expect(component.loadUserData).toHaveBeenCalled();
    });

    it('should cleanup subscriptions on destroy', () => {
      component.ngOnInit();
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});