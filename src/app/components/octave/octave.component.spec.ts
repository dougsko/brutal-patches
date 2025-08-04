import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { OctaveComponent } from './octave.component';

describe('OctaveComponent', () => {
  let component: OctaveComponent;
  let fixture: ComponentFixture<OctaveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OctaveComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OctaveComponent);
    component = fixture.componentInstance;
    component.patch = {
      octave: 0
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
