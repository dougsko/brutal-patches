import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { SequencerComponent } from './sequencer.component';

describe('SequencerComponent', () => {
  let component: SequencerComponent;
  let fixture: ComponentFixture<SequencerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SequencerComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SequencerComponent);
    component = fixture.componentInstance;
    component.patch = {
      pattern: 1,
      play: 0,
      rate_2: 0.25
    } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
