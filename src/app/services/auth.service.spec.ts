import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockTokenStorage: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    const tokenStorageSpy = jasmine.createSpyObj('TokenStorageService', 
      ['saveToken', 'getToken', 'saveUser', 'getUser', 'signOut']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: TokenStorageService, useValue: tokenStorageSpy }
      ]
    });
    
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    mockTokenStorage = TestBed.inject(TokenStorageService) as jasmine.SpyObj<TokenStorageService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login user successfully', () => {
    const mockCredentials = { username: 'testuser', password: 'testpass' };
    const mockResponse = { 
      access_token: 'mock-jwt-token',
      username: 'testuser' 
    };

    service.login(mockCredentials.username, mockCredentials.password).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockCredentials);
    req.flush(mockResponse);
  });

  it('should handle login errors', () => {
    service.login('invalid', 'credentials').subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error.status).toBe(401);
      }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should make login API call with correct endpoint', () => {
    const mockResponse = { access_token: 'token', username: 'test' };

    service.login('test', 'pass').subscribe((response: any) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush(mockResponse);
  });
});
