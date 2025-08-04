import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { PatchComponent } from './patch.component';
import { PatchService } from '../../services/patch.service';
import { mockPatch } from '../../test-utils/mock-patch';

describe('PatchComponent', () => {
  let component: PatchComponent;
  let fixture: ComponentFixture<PatchComponent>;

  beforeEach(async () => {
    const mockActivatedRoute = {
      params: { subscribe: jasmine.createSpy('subscribe') },
      snapshot: { 
        paramMap: { 
          get: jasmine.createSpy('get').and.returnValue('1') 
        } 
      }
    };
    const mockLocation = {
      back: jasmine.createSpy('back')
    };
    const mockPatchService = {
      getPatch: jasmine.createSpy('getPatch').and.returnValue(of(mockPatch)),
      createPatch: jasmine.createSpy('createPatch').and.returnValue(of(mockPatch)),
      updatePatch: jasmine.createSpy('updatePatch').and.returnValue(of(mockPatch)),
      deletePatch: jasmine.createSpy('deletePatch').and.returnValue(of({})),
      getPatches: jasmine.createSpy('getPatches').and.returnValue(of([mockPatch]))
    };

    await TestBed.configureTestingModule({
      declarations: [ PatchComponent ],
      imports: [ HttpClientTestingModule ],
      providers: [
        { provide: PatchService, useValue: mockPatchService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Location, useValue: mockLocation }
      ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
