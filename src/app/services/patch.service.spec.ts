import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PatchService } from './patch.service';
import { environment } from '../../environments/environment';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PatchService', () => {
  let service: PatchService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/api/patches`;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [PatchService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    service = TestBed.inject(PatchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all patches', () => {
    const mockPatches = [
      { id: 1, title: 'Test Patch 1', description: 'First patch' },
      { id: 2, title: 'Test Patch 2', description: 'Second patch' }
    ];

    service.getPatches().subscribe(patches => {
      expect(patches).toEqual(mockPatches);
      expect(patches.length).toBe(2);
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockPatches);
  });

  it('should fetch latest patches with pagination', () => {
    const mockPatches = [{ id: 1, title: 'Latest Patch' }];
    const first = 0;
    const last = 10;

    service.getLatestPatches(first, last).subscribe(patches => {
      expect(patches).toEqual(mockPatches);
    });

    const req = httpMock.expectOne(`${apiUrl}/${first}/${last}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPatches);
  });

  it('should handle patch fetching errors', () => {
    service.getPatches().subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        expect(error).toBeTruthy();
      }
    });

    const req = httpMock.expectOne(apiUrl);
    req.flush('Server Error', { status: 500, statusText: 'Server Error' });
  });

  it('should get patch total count', () => {
    const mockTotal = 42;

    service.getPatchTotal().subscribe(total => {
      expect(total).toBe(mockTotal);
    });

    const req = httpMock.expectOne(`${apiUrl}/total`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTotal);
  });
});
