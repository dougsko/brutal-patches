import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OscillatorComponent } from './oscillator.component';

describe('OscillatorComponent', () => {
  let fixture: ComponentFixture<OscillatorComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OscillatorComponent] }).compileComponents();
    fixture = TestBed.createComponent(OscillatorComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
