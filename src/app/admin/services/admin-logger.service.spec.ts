import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AdminLoggerService, AdminLogEntry } from './admin-logger.service';

describe('AdminLoggerService', () => {
  let service: AdminLoggerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminLoggerService]
    });

    service = TestBed.inject(AdminLoggerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log security events', () => {
    const event = 'admin_access_granted';
    const metadata = { user: 'testadmin', route: '/admin/dashboard' };

    spyOn(console, 'log');

    service.logSecurityEvent(event, metadata);

    const logs = service.getLocalLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('security');
    expect(logs[0].event).toBe(event);
    expect(logs[0].user).toBe('testadmin');
    expect(console.log).toHaveBeenCalledWith(`[SECURITY] ${event}:`, metadata);
  });

  it('should log admin actions', () => {
    const action = 'user_moderated';
    const metadata = { user: 'testadmin', userId: 123 };

    spyOn(console, 'log');

    service.logAdminAction(action, metadata);

    const logs = service.getLocalLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('action');
    expect(logs[0].event).toBe(action);
    expect(logs[0].user).toBe('testadmin');
    expect(console.log).toHaveBeenCalledWith(`[ADMIN ACTION] ${action}:`, metadata);
  });

  it('should log system events', () => {
    const event = 'database_connection_lost';
    const metadata = { server: 'db1.example.com' };
    const severity = 'high' as const;

    spyOn(console, 'log');

    service.logSystemEvent(event, metadata, severity);

    const logs = service.getLocalLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('system');
    expect(logs[0].event).toBe(event);
    expect(logs[0].severity).toBe(severity);
    expect(console.log).toHaveBeenCalledWith(`[SYSTEM] ${event}:`, metadata);
  });

  it('should log errors', () => {
    const error = new Error('Test error');
    const context = 'AdminApiService';
    const metadata = { operation: 'getUsers' };

    spyOn(console, 'error');

    service.logError(error, context, metadata);

    const logs = service.getLocalLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('error');
    expect(logs[0].event).toBe('admin_error');
    expect(logs[0].severity).toBe('high');
    expect(logs[0].metadata.error).toBe('Test error');
    expect(logs[0].metadata.context).toBe(context);
    expect(console.error).toHaveBeenCalledWith(`[ADMIN ERROR] ${context}:`, error, metadata);
  });

  it('should determine correct severity for security events', () => {
    service.logSecurityEvent('admin_access_denied_insufficient_privileges', {});
    service.logSecurityEvent('admin_access_granted', {});
    service.logSecurityEvent('admin_unknown_event', {});

    const logs = service.getLocalLogs();
    expect(logs[0].severity).toBe('critical');
    expect(logs[1].severity).toBe('medium');
    expect(logs[2].severity).toBe('low');
  });

  it('should clear local logs', () => {
    service.logAdminAction('test_action', {});
    expect(service.getLocalLogs().length).toBe(1);

    service.clearLocalLogs();
    expect(service.getLocalLogs().length).toBe(0);
  });

  it('should flush logs to server', async () => {
    service.logAdminAction('test_action', { user: 'testadmin' });
    
    const flushPromise = service.forceFlush();
    
    const req = httpMock.expectOne(req => req.url.includes('/api/admin/logs/batch'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.logs).toHaveSize(1);
    expect(req.request.body.logs[0].event).toBe('test_action');

    req.flush({ success: true });

    const result = await flushPromise;
    expect(result).toBe(true);
    expect(service.getLocalLogs().length).toBe(0);
  });

  it('should handle flush errors and restore logs', async () => {
    service.logAdminAction('test_action', { user: 'testadmin' });
    
    spyOn(console, 'error');
    
    const flushPromise = service.forceFlush();
    
    const req = httpMock.expectOne(req => req.url.includes('/api/admin/logs/batch'));
    req.error(new ErrorEvent('Network error'));

    const result = await flushPromise;
    expect(result).toBe(false);
    expect(service.getLocalLogs().length).toBe(1); // Logs restored
    expect(console.error).toHaveBeenCalled();
  });

  it('should prevent buffer overflow', () => {
    // Add more logs than MAX_BUFFER_SIZE
    const maxSize = (service as any).MAX_BUFFER_SIZE;
    
    for (let i = 0; i < maxSize + 10; i++) {
      service.logAdminAction(`action_${i}`, {});
    }

    const logs = service.getLocalLogs();
    expect(logs.length).toBe(maxSize);
    expect(logs[0].event).toBe(`action_10`); // Oldest removed
    expect(logs[logs.length - 1].event).toBe(`action_${maxSize + 9}`); // Newest kept
  });

  it('should immediately flush critical security events', () => {
    spyOn(service, 'forceFlush').and.returnValue(Promise.resolve(true));

    service.logSecurityEvent('admin_privilege_escalation_attempt', {});

    expect(service.forceFlush).toHaveBeenCalled();
  });
});