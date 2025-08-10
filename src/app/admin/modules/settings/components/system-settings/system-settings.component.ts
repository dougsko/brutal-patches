import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { of } from 'rxjs';

import { AdminApiService, SystemSettings, BulkOperationResult } from '../../../../services/admin-api.service';
import { AdminLoggerService } from '../../../../services/admin-logger.service';
import { SystemConfiguration, BackupInfo } from '../../../../interfaces/admin.interfaces';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  expanded: boolean;
}

@Component({
  selector: 'app-system-settings',
  templateUrl: './system-settings.component.html',
  styleUrls: ['./system-settings.component.scss']
})
export class SystemSettingsComponent implements OnInit, OnDestroy {
  settingsForm: FormGroup;
  
  loading = false;
  saving = false;
  error: string | null = null;
  hasUnsavedChanges = false;
  
  // Settings sections
  settingsSections: SettingsSection[] = [
    {
      id: 'general',
      title: 'General Settings',
      description: 'Basic site configuration and maintenance settings',
      icon: 'settings',
      expanded: true
    },
    {
      id: 'registration',
      title: 'User Registration',
      description: 'Control user registration and verification process',
      icon: 'person_add',
      expanded: false
    },
    {
      id: 'content',
      title: 'Content Settings',
      description: 'File upload limits and moderation settings',
      icon: 'library_music',
      expanded: false
    },
    {
      id: 'security',
      title: 'Security Settings',
      description: 'Authentication and session security configuration',
      icon: 'security',
      expanded: false
    },
    {
      id: 'performance',
      title: 'Performance Settings',
      description: 'Caching and optimization configuration',
      icon: 'speed',
      expanded: false
    },
    {
      id: 'notifications',
      title: 'Notification Settings',
      description: 'Email, SMS, and push notification configuration',
      icon: 'notifications',
      expanded: false
    }
  ];

  // File type options for content settings
  allowedFileTypes = [
    { value: '.syx', label: 'SysEx Files (.syx)', description: 'System Exclusive MIDI files' },
    { value: '.json', label: 'JSON Files (.json)', description: 'JavaScript Object Notation' },
    { value: '.xml', label: 'XML Files (.xml)', description: 'Extensible Markup Language' },
    { value: '.txt', label: 'Text Files (.txt)', description: 'Plain text files' }
  ];

  // Admin notification types
  notificationTypes = [
    { value: 'user_registration', label: 'New User Registrations' },
    { value: 'content_reports', label: 'Content Reports' },
    { value: 'security_alerts', label: 'Security Alerts' },
    { value: 'system_errors', label: 'System Errors' },
    { value: 'backup_status', label: 'Backup Status' }
  ];

  // Backup information
  backupInfo: BackupInfo[] = [];
  lastBackup: Date | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private adminApi: AdminApiService,
    private logger: AdminLoggerService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadSystemSettings();
    this.setupFormChangeTracking();
    
    this.logger.logAdminAction('system_settings_viewed', {
      timestamp: new Date().toISOString()
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.settingsForm = this.formBuilder.group({
      general: this.formBuilder.group({
        siteName: ['Brutal Patches', [Validators.required, Validators.minLength(1)]],
        siteUrl: ['https://brutalpatches.com', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
        adminEmail: ['admin@brutalpatches.com', [Validators.required, Validators.email]],
        maintenanceMode: [false],
        maintenanceMessage: ['Site is currently under maintenance. Please check back soon.']
      }),
      
      registration: this.formBuilder.group({
        enabled: [true],
        requireEmailVerification: [true],
        autoApproveUsers: [false],
        defaultRoles: [['user']]
      }),
      
      content: this.formBuilder.group({
        maxPatchSize: [5, [Validators.required, Validators.min(1), Validators.max(100)]], // MB
        allowedFileTypes: [this.allowedFileTypes.map(type => type.value)],
        moderationEnabled: [true],
        autoModerationEnabled: [false],
        requireApproval: [false]
      }),
      
      security: this.formBuilder.group({
        sessionTimeout: [30, [Validators.required, Validators.min(5), Validators.max(480)]], // minutes
        maxLoginAttempts: [5, [Validators.required, Validators.min(3), Validators.max(20)]],
        lockoutDuration: [15, [Validators.required, Validators.min(1), Validators.max(1440)]], // minutes
        requireStrongPasswords: [true],
        enableTwoFactor: [false]
      }),
      
      performance: this.formBuilder.group({
        cacheEnabled: [true],
        cacheDuration: [3600, [Validators.required, Validators.min(300), Validators.max(86400)]], // seconds
        compressionEnabled: [true],
        cdnEnabled: [false]
      }),
      
      notifications: this.formBuilder.group({
        emailEnabled: [true],
        smsEnabled: [false],
        pushEnabled: [true],
        adminNotifications: [this.notificationTypes.map(type => type.value)]
      })
    });
  }

  private setupFormChangeTracking(): void {
    this.settingsForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.hasUnsavedChanges = this.settingsForm.dirty;
    });
  }

  private loadSystemSettings(): void {
    this.loading = true;
    this.error = null;

    this.adminApi.getSystemSettings().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.error = 'Failed to load system settings';
        this.loading = false;
        this.logger.logError(error, 'SystemSettingsComponent', { action: 'loadSystemSettings' });
        return of(null);
      })
    ).subscribe(settings => {
      if (settings) {
        this.populateFormFromSettings(settings);
      }
      this.loading = false;
    });
  }

  private populateFormFromSettings(settings: SystemSettings): void {
    // In a real implementation, we'd map the API response to our form structure
    // For now, we'll use the default values set in initializeForm()
    
    // Example of how to map settings:
    if (settings.maintenanceMode !== undefined) {
      this.settingsForm.get('general.maintenanceMode')?.setValue(settings.maintenanceMode);
    }
    if (settings.registrationEnabled !== undefined) {
      this.settingsForm.get('registration.enabled')?.setValue(settings.registrationEnabled);
    }
    if (settings.maxUploadSize !== undefined) {
      this.settingsForm.get('content.maxPatchSize')?.setValue(settings.maxUploadSize);
    }
    
    this.settingsForm.markAsPristine();
  }

  onSaveSettings(): void {
    if (this.settingsForm.invalid) {
      this.markFormGroupTouched(this.settingsForm);
      this.snackBar.open('Please fix validation errors before saving', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.saving = true;
    this.error = null;

    const formValue = this.settingsForm.value;
    const settingsToSave = this.mapFormToSettings(formValue);

    this.adminApi.updateSystemSettings(settingsToSave).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        if (result.success) {
          this.saving = false;
          this.hasUnsavedChanges = false;
          this.settingsForm.markAsPristine();
          
          this.snackBar.open('Settings saved successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          this.logger.logAdminAction('system_settings_updated', {
            changes: settingsToSave,
            timestamp: new Date().toISOString()
          });
        } else {
          this.saving = false;
          this.error = result.message || 'Failed to save settings';
        }
      },
      error: (error) => {
        this.saving = false;
        this.error = 'Failed to save settings. Please try again.';
        this.logger.logError(error, 'SystemSettingsComponent', { action: 'saveSettings' });
      }
    });
  }

  private mapFormToSettings(formValue: any): Partial<SystemSettings> {
    // Map our form structure to the API expected format
    return {
      maintenanceMode: formValue.general.maintenanceMode,
      registrationEnabled: formValue.registration.enabled,
      maxUploadSize: formValue.content.maxPatchSize,
      rateLimit: {
        windowMs: 900000, // 15 minutes
        max: 100
      }
    };
  }

  onResetSettings(): void {
    if (this.hasUnsavedChanges) {
      const confirmReset = confirm('Are you sure you want to reset all settings to their last saved values? This action cannot be undone.');
      if (!confirmReset) return;
    }
    
    this.loadSystemSettings();
    this.snackBar.open('Settings reset to last saved values', 'Close', { duration: 2000 });
    
    this.logger.logAdminAction('system_settings_reset', {
      timestamp: new Date().toISOString()
    });
  }

  onToggleSection(sectionId: string): void {
    const section = this.settingsSections.find(s => s.id === sectionId);
    if (section) {
      section.expanded = !section.expanded;
      
      this.logger.logAdminAction('settings_section_toggled', {
        section: sectionId,
        expanded: section.expanded
      });
    }
  }

  onTestEmailSettings(): void {
    // Mock email test functionality
    this.snackBar.open('Test email sent successfully', 'Close', { duration: 3000 });
    
    this.logger.logAdminAction('email_settings_tested', {
      timestamp: new Date().toISOString()
    });
  }

  onClearCache(): void {
    this.adminApi.clearCache().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        if (result.success) {
          this.snackBar.open('Cache cleared successfully', 'Close', { duration: 3000 });
          
          this.logger.logAdminAction('cache_cleared', {
            timestamp: new Date().toISOString()
          });
        }
      },
      error: (error) => {
        this.snackBar.open('Failed to clear cache', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.logger.logError(error, 'SystemSettingsComponent', { action: 'clearCache' });
      }
    });
  }

  onCreateBackup(): void {
    // Mock backup creation
    this.snackBar.open('Backup creation started', 'Close', { duration: 3000 });
    
    this.logger.logAdminAction('backup_created', {
      timestamp: new Date().toISOString()
    });
    
    // Mock adding backup to list
    const newBackup: BackupInfo = {
      id: `backup-${Date.now()}`,
      filename: `backup-${new Date().toISOString().split('T')[0]}.zip`,
      size: Math.floor(Math.random() * 1000000000), // Random size in bytes
      createdAt: new Date().toISOString(),
      type: 'full',
      status: 'completed'
    };
    
    this.backupInfo.unshift(newBackup);
    this.lastBackup = new Date();
  }

  onDownloadBackup(backup: BackupInfo): void {
    // Mock backup download
    this.snackBar.open(`Downloading ${backup.filename}`, 'Close', { duration: 2000 });
    
    this.logger.logAdminAction('backup_downloaded', {
      backupId: backup.id,
      filename: backup.filename
    });
  }

  onDeleteBackup(backupId: string): void {
    const confirmDelete = confirm('Are you sure you want to delete this backup? This action cannot be undone.');
    if (!confirmDelete) return;
    
    this.backupInfo = this.backupInfo.filter(b => b.id !== backupId);
    this.snackBar.open('Backup deleted successfully', 'Close', { duration: 2000 });
    
    this.logger.logAdminAction('backup_deleted', {
      backupId: backupId
    });
  }

  onMaintenanceModeChange(enabled: boolean): void {
    if (enabled) {
      const confirmMaintenance = confirm(
        'Enabling maintenance mode will make the site inaccessible to regular users. Only administrators will be able to access the site. Are you sure?'
      );
      if (!confirmMaintenance) {
        this.settingsForm.get('general.maintenanceMode')?.setValue(false);
        return;
      }
    }
    
    this.logger.logAdminAction('maintenance_mode_toggled', {
      enabled: enabled,
      timestamp: new Date().toISOString()
    });
  }

  onExportSettings(): void {
    const settings = this.settingsForm.value;
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `brutal-patches-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    this.snackBar.open('Settings exported successfully', 'Close', { duration: 2000 });
    
    this.logger.logAdminAction('settings_exported', {
      timestamp: new Date().toISOString()
    });
  }

  onImportSettings(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        
        // Validate and apply imported settings
        if (this.validateImportedSettings(settings)) {
          this.settingsForm.patchValue(settings);
          this.snackBar.open('Settings imported successfully', 'Close', { duration: 3000 });
          
          this.logger.logAdminAction('settings_imported', {
            filename: file.name,
            timestamp: new Date().toISOString()
          });
        } else {
          this.snackBar.open('Invalid settings file format', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      } catch (error) {
        this.snackBar.open('Failed to parse settings file', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    };
    reader.readAsText(file);
    
    // Clear the input
    event.target.value = '';
  }

  private validateImportedSettings(settings: any): boolean {
    // Basic validation of imported settings structure
    const requiredSections = ['general', 'registration', 'content', 'security', 'performance', 'notifications'];
    return requiredSections.every(section => settings.hasOwnProperty(section));
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
  getFieldError(formPath: string): string {
    const field = this.settingsForm.get(formPath);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Invalid email format';
      if (field.errors['pattern']) return 'Invalid format';
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
      if (field.errors['max']) return `Maximum value is ${field.errors['max'].max}`;
      if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength}`;
    }
    return '';
  }

  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  canDeactivate(): boolean {
    if (this.hasUnsavedChanges) {
      return confirm('You have unsaved changes. Are you sure you want to leave?');
    }
    return true;
  }
}