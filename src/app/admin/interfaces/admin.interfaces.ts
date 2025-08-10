// Core Admin Data Types

export interface AdminDashboardCard {
  title: string;
  value: string | number;
  icon: string;
  color: 'primary' | 'accent' | 'warn';
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    period: string;
  };
  link?: string;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalPatches: number;
  totalCollections: number;
  averageRating: number;
  systemUptime: number;
  newUsersToday: number;
  newPatchesToday: number;
  pendingModerationItems: number;
}

export interface SystemPerformance {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

// User Management Types
export interface AdminUserProfile {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  roles: UserRole[];
  status: 'active' | 'suspended' | 'banned' | 'pending';
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  loginCount: number;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  
  // Statistics
  patchCount: number;
  collectionCount: number;
  averagePatchRating: number;
  totalViews: number;
  totalDownloads: number;
  
  // Moderation
  warningCount: number;
  suspensionHistory: SuspensionRecord[];
  notes: AdminNote[];
}

export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
  isDefault: boolean;
  createdAt: string;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'moderate';
  description: string;
}

export interface SuspensionRecord {
  id: string;
  reason: string;
  startDate: string;
  endDate?: string;
  adminUsername: string;
  isActive: boolean;
  notes?: string;
}

export interface AdminNote {
  id: string;
  content: string;
  adminUsername: string;
  createdAt: string;
  type: 'general' | 'warning' | 'suspension' | 'ban';
  isVisible: boolean;
}

// Content Moderation Types
export interface ModerationQueueItem {
  id: string;
  type: 'patch' | 'comment' | 'user_profile' | 'collection';
  title: string;
  content: string;
  author: {
    id: number;
    username: string;
    email: string;
  };
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reports: ModerationReport[];
  assignedTo?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  autoModFlags: AutoModerationFlag[];
}

export interface ModerationReport {
  id: string;
  reporterId: number;
  reporterUsername: string;
  reason: 'spam' | 'inappropriate' | 'copyright' | 'harassment' | 'other';
  description: string;
  submittedAt: string;
  reviewed: boolean;
}

export interface AutoModerationFlag {
  type: 'profanity' | 'spam_pattern' | 'duplicate_content' | 'suspicious_links';
  confidence: number;
  details: string;
}

export interface ModerationAction {
  action: 'approve' | 'reject' | 'escalate' | 'require_changes';
  notes: string;
  adminUsername: string;
  timestamp: string;
  notifyUser: boolean;
}

// Analytics Types
export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface CategoryData {
  category: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface AnalyticsFilter {
  timeRange: '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';
  startDate?: string;
  endDate?: string;
  category?: string;
  userSegment?: 'all' | 'new' | 'active' | 'inactive';
}

export interface UserGrowthData {
  registrations: TimeSeriesData[];
  activations: TimeSeriesData[];
  churned: TimeSeriesData[];
  totalActive: number;
  growthRate: number;
}

export interface ContentAnalytics {
  patchCreation: TimeSeriesData[];
  patchUpdates: TimeSeriesData[];
  ratings: TimeSeriesData[];
  downloads: TimeSeriesData[];
  topCategories: CategoryData[];
  ratingDistribution: CategoryData[];
}

// System Management Types
export interface SystemConfiguration {
  general: {
    siteName: string;
    siteUrl: string;
    adminEmail: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  
  registration: {
    enabled: boolean;
    requireEmailVerification: boolean;
    autoApproveUsers: boolean;
    defaultRoles: string[];
  };
  
  content: {
    maxPatchSize: number;
    allowedFileTypes: string[];
    moderationEnabled: boolean;
    autoModerationEnabled: boolean;
    requireApproval: boolean;
  };
  
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireStrongPasswords: boolean;
    enableTwoFactor: boolean;
  };
  
  performance: {
    cacheEnabled: boolean;
    cacheDuration: number;
    compressionEnabled: boolean;
    cdnEnabled: boolean;
  };
  
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    adminNotifications: string[];
  };
}

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  type: 'full' | 'incremental' | 'config_only';
  status: 'completed' | 'in_progress' | 'failed';
  downloadUrl?: string;
}

// Audit & Logging Types
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId?: number;
  username?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: {
    method: string;
    endpoint: string;
    ip: string;
    userAgent: string;
    changes?: any;
    oldValues?: any;
    newValues?: any;
  };
  result: 'success' | 'failure' | 'partial';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityAlert {
  id: string;
  type: 'failed_login' | 'privilege_escalation' | 'suspicious_activity' | 'data_breach' | 'system_intrusion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  source: {
    ip: string;
    userAgent?: string;
    userId?: number;
    username?: string;
  };
  description: string;
  evidence: any;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolvedAt?: string;
  notes?: string;
}

// Export & Import Types
export interface ExportJob {
  id: string;
  type: 'users' | 'patches' | 'collections' | 'logs' | 'full_backup';
  format: 'json' | 'csv' | 'xlsx';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
  filters?: any;
  requestedBy: string;
}

export interface ImportJob {
  id: string;
  type: 'users' | 'patches' | 'collections';
  filename: string;
  status: 'pending' | 'validating' | 'importing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  createdAt: string;
  completedAt?: string;
  errors: ImportError[];
  validation: ValidationResult;
  requestedBy: string;
}

export interface ImportError {
  row: number;
  field: string;
  value: any;
  error: string;
}

export interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  errors: ImportError[];
  warnings: ImportError[];
}

// Notification Types
export interface AdminNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
  expiresAt?: string;
  persistent: boolean;
}

export interface NotificationAction {
  label: string;
  action: string;
  style: 'primary' | 'secondary' | 'warn';
}

// Table & List Types
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable: boolean;
  filterable: boolean;
  type: 'text' | 'number' | 'date' | 'boolean' | 'badge' | 'actions';
  width?: string;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any) => string;
}

export interface TableFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
  value: any;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions: number[];
}

// UI State Types
export interface AdminUIState {
  sidenavOpen: boolean;
  theme: 'light' | 'dark';
  language: string;
  dateFormat: string;
  timeZone: string;
  refreshInterval: number;
  notifications: AdminNotification[];
  activeRoute: string;
  breadcrumbs: Breadcrumb[];
}

export interface Breadcrumb {
  label: string;
  route?: string;
  icon?: string;
}