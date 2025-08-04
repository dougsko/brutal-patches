import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PatchListComponent } from './patch-list.component';
import { PatchService } from '../../services/patch.service';
import { TokenStorageService } from '../../services/token-storage.service';

describe('PatchListComponent', () => {
  let component: PatchListComponent;
  let fixture: ComponentFixture<PatchListComponent>;

  beforeEach(async () => {
    const mockTokenStorage = {
      getUser: jasmine.createSpy('getUser').and.returnValue({ username: 'testuser' }),
      getToken: jasmine.createSpy('getToken').and.returnValue('mock-token')
    };

    await TestBed.configureTestingModule({
      declarations: [ PatchListComponent ],
      imports: [ HttpClientTestingModule ],
      providers: [
        PatchService,
        { provide: TokenStorageService, useValue: mockTokenStorage }
      ],
      schemas: [ NO_ERRORS_SCHEMA ]
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
