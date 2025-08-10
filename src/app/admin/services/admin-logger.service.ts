import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AdminLogEntry {
  id?: string;
  timestamp: string;
  type: 'security' | 'action' | 'system' | 'error';
  event: string;
  user?: string;
  metadata?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityEvent {
  event: string;
  metadata: {
    route?: string;
    user?: string;
    timestamp: string;
    [key: string]: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminLoggerService {
  private logBuffer: AdminLogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds
  private readonly API_URL = `${environment.apiUrl}/api/admin/logs`;

  constructor(private http: HttpClient) {
    // Set up periodic log flushing
    setInterval(() => {
      this.flushLogs();
    }, this.FLUSH_INTERVAL);

    // Flush logs on page unload
    window.addEventListener('beforeunload', () => {
      this.flushLogsSync();
    });
  }

  /**
   * Log security-related events (access attempts, privilege escalation, etc.)
   */
  logSecurityEvent(event: string, metadata: any): void {
    const logEntry: AdminLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'security',
      event: event,
      user: metadata.user || 'unknown',
      metadata: metadata,
      severity: this.determineSeverity(event, metadata)
    };

    this.addToBuffer(logEntry);
    
    // Immediately flush critical security events
    if (logEntry.severity === 'critical') {
      this.flushLogs();
    }

    // Also log to console for debugging
    console.log(`[SECURITY] ${event}:`, metadata);
  }

  /**
   * Log admin actions (navigation, data changes, user management, etc.)
   */
  logAdminAction(action: string, metadata: any): void {
    const logEntry: AdminLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'action',
      event: action,
      user: metadata.user || 'unknown',
      metadata: metadata,
      severity: this.determineActionSeverity(action)
    };

    this.addToBuffer(logEntry);
    console.log(`[ADMIN ACTION] ${action}:`, metadata);
  }

  /**
   * Log system events (errors, performance issues, etc.)
   */
  logSystemEvent(event: string, metadata: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const logEntry: AdminLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'system',
      event: event,
      metadata: metadata,
      severity: severity
    };

    this.addToBuffer(logEntry);
    console.log(`[SYSTEM] ${event}:`, metadata);
  }

  /**
   * Log error events
   */
  logError(error: Error, context: string, metadata: any = {}): void {
    const logEntry: AdminLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'error',
      event: 'admin_error',
      metadata: {
        error: error.message,
        stack: error.stack,
        context: context,
        ...metadata
      },
      severity: 'high'
    };

    this.addToBuffer(logEntry);
    console.error(`[ADMIN ERROR] ${context}:`, error, metadata);
  }

  /**
   * Get local log entries for debugging
   */
  getLocalLogs(): AdminLogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Clear local log buffer
   */
  clearLocalLogs(): void {
    this.logBuffer = [];
  }

  /**
   * Force flush logs to server
   */
  forceFlush(): Promise<boolean> {
    return this.flushLogs();
  }

  private addToBuffer(logEntry: AdminLogEntry): void {
    this.logBuffer.push(logEntry);

    // Prevent buffer overflow
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer.shift(); // Remove oldest entry
    }

    // Auto-flush if buffer is getting full
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE * 0.8) {
      this.flushLogs();
    }
  }

  private async flushLogs(): Promise<boolean> {
    if (this.logBuffer.length === 0) {
      return true;
    }

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.http.post(`${this.API_URL}/batch`, {
        logs: logsToSend
      }).toPromise();

      return true;
    } catch (error) {
      // If sending fails, put logs back in buffer
      this.logBuffer = [...logsToSend, ...this.logBuffer];
      console.error('Failed to send admin logs:', error);
      return false;
    }
  }

  private flushLogsSync(): void {
    if (this.logBuffer.length === 0) {
      return;
    }

    // Use sendBeacon for synchronous sending during page unload
    const logsToSend = [...this.logBuffer];
    
    try {
      if (navigator.sendBeacon) {
        const data = JSON.stringify({ logs: logsToSend });
        navigator.sendBeacon(`${this.API_URL}/batch`, data);
      }
    } catch (error) {
      console.error('Failed to send admin logs via sendBeacon:', error);
    }
  }

  private determineSeverity(event: string, metadata: any): 'low' | 'medium' | 'high' | 'critical' {
    // Critical security events
    const criticalEvents = [
      'admin_access_denied_insufficient_privileges',
      'admin_privilege_escalation_attempt',
      'admin_unauthorized_action',
      'admin_suspicious_activity'
    ];

    // High severity events
    const highEvents = [
      'admin_access_denied_no_token',
      'admin_login_failed',
      'admin_token_expired'
    ];

    // Medium severity events
    const mediumEvents = [
      'admin_access_granted',
      'admin_logout',
      'admin_session_timeout'
    ];

    if (criticalEvents.some(e => event.includes(e))) {
      return 'critical';
    }
    
    if (highEvents.some(e => event.includes(e))) {
      return 'high';
    }

    if (mediumEvents.some(e => event.includes(e))) {
      return 'medium';
    }

    return 'low';
  }

  private determineActionSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    // High severity actions
    const highActions = [
      'user_suspended',
      'user_deleted',
      'content_deleted',
      'system_settings_changed',
      'bulk_operation'
    ];

    // Medium severity actions
    const mediumActions = [
      'user_moderated',
      'content_moderated',
      'admin_panel_accessed',
      'data_exported'
    ];

    if (highActions.some(a => action.includes(a))) {
      return 'high';
    }

    if (mediumActions.some(a => action.includes(a))) {
      return 'medium';
    }

    return 'low';
  }
}