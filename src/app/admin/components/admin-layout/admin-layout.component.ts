import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, shareReplay } from 'rxjs/operators';

import { AuthService } from '../../../services/auth.service';
import { TokenStorageService } from '../../../services/token-storage.service';
import { AdminLoggerService } from '../../services/admin-logger.service';

export interface AdminNavItem {
  label: string;
  icon: string;
  route: string;
  permission?: string;
  badge?: {
    text: string;
    color: 'primary' | 'accent' | 'warn';
  };
}

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit {
  @ViewChild('drawer') drawer!: MatSidenav;

  adminUser: any = {};
  
  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  navigationItems: AdminNavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/admin/dashboard'
    },
    {
      label: 'User Management',
      icon: 'people',
      route: '/admin/users',
      permission: 'admin.users.manage'
    },
    {
      label: 'Content Moderation',
      icon: 'gavel',
      route: '/admin/moderation',
      permission: 'admin.content.moderate',
      badge: {
        text: '3',
        color: 'warn'
      }
    },
    {
      label: 'Analytics',
      icon: 'analytics',
      route: '/admin/analytics',
      permission: 'admin.analytics.view'
    },
    {
      label: 'System Settings',
      icon: 'settings',
      route: '/admin/settings',
      permission: 'admin.settings.manage'
    }
  ];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private authService: AuthService,
    private tokenStorage: TokenStorageService,
    private router: Router,
    private logger: AdminLoggerService
  ) {}

  ngOnInit(): void {
    this.loadAdminUserInfo();
    this.logAdminAccess();
  }

  private loadAdminUserInfo(): void {
    const tokenInfo = this.tokenStorage.getTokenInfo();
    if (tokenInfo) {
      this.adminUser = {
        username: tokenInfo.username,
        email: tokenInfo.email,
        roles: tokenInfo.roles,
        isAdmin: tokenInfo.isAdmin,
        lastLogin: new Date().toISOString()
      };
    }
  }

  private logAdminAccess(): void {
    this.logger.logAdminAction('admin_panel_accessed', {
      user: this.adminUser.username,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  }

  hasPermission(permission?: string): boolean {
    if (!permission) return true;
    
    // For now, admin users have all permissions
    // This could be enhanced with granular permission checking
    return this.adminUser.isAdmin || false;
  }

  onNavItemClick(item: AdminNavItem): void {
    this.logger.logAdminAction('admin_navigation', {
      user: this.adminUser.username,
      route: item.route,
      timestamp: new Date().toISOString()
    });

    this.router.navigate([item.route]);
    
    // Close drawer on mobile after navigation
    this.isHandset$.subscribe(isHandset => {
      if (isHandset && this.drawer) {
        this.drawer.close();
      }
    });
  }

  onLogout(): void {
    this.logger.logAdminAction('admin_logout', {
      user: this.adminUser.username,
      timestamp: new Date().toISOString()
    });

    this.tokenStorage.signOut();
    this.router.navigate(['/login']);
  }

  onUserMenuClick(action: string): void {
    this.logger.logAdminAction('admin_user_menu_click', {
      user: this.adminUser.username,
      action: action,
      timestamp: new Date().toISOString()
    });

    switch (action) {
      case 'profile':
        this.router.navigate(['/profile']);
        break;
      case 'settings':
        this.router.navigate(['/admin/settings']);
        break;
      case 'logout':
        this.onLogout();
        break;
    }
  }
}