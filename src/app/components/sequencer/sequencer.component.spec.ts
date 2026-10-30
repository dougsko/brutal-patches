import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SequencerComponent } from './sequencer.component';

describe('SequencerComponent', () => {
  let fixture: ComponentFixture<SequencerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SequencerComponent] }).compileComponents();
    fixture = TestBed.createComponent(SequencerComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
