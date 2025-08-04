import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PatchListComponent } from './patch-list.component';
import { PatchService } from '../../services/patch.service';
import { TokenStorageService } from '../../services/token-storage.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PatchListComponent', () => {
  let component: PatchListComponent;
  let fixture: ComponentFixture<PatchListComponent>;

  beforeEach(async () => {
    const mockTokenStorage = {
      getUser: jasmine.createSpy('getUser').and.returnValue({ username: 'testuser' }),
      getToken: jasmine.createSpy('getToken').and.returnValue('mock-token')
    };

    await TestBed.configureTestingModule({
    declarations: [PatchListComponent],
    schemas: [NO_ERRORS_SCHEMA],
    imports: [],
    providers: [
        PatchService,
        { provide: TokenStorageService, useValue: mockTokenStorage },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
    ]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PatchListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
