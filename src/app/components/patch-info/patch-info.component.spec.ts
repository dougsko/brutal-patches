import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PatchInfoComponent } from './patch-info.component';

describe('PatchInfoComponent', () => {
  let component: PatchInfoComponent;
  let fixture: ComponentFixture<PatchInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PatchInfoComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PatchInfoComponent);
    component = fixture.componentInstance;
    component.patch = {
      id: 1,
      title: 'Test Patch',
      description: 'Test Description'
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
