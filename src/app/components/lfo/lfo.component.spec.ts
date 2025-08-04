import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { LfoComponent } from './lfo.component';

describe('LfoComponent', () => {
  let component: LfoComponent;
  let fixture: ComponentFixture<LfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LfoComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LfoComponent);
    component = fixture.componentInstance;
    component.patch = {
      amount: 0.5,
      rate: 0.3,
      wave: 1,
      sync: 0
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
