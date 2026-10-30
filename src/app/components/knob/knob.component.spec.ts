import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KnobComponent } from './knob.component';

describe('KnobComponent', () => {
  let fixture: ComponentFixture<KnobComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KnobComponent] }).compileComponents();
    fixture = TestBed.createComponent(KnobComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
