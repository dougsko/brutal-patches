import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { KnobComponent } from './knob.component';

describe('KnobComponent', () => {
  let component: KnobComponent;
  let fixture: ComponentFixture<KnobComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KnobComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KnobComponent);
    component = fixture.componentInstance;
    // Set default properties for knob component
    component.patch = {} as any;
    component.label = 'Test Knob';
    component.name = 'testKnob';
    component.sFlow = 'linear';
    component.lFlow = '100';
    component.lower = '0';
    component.max = '100';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
