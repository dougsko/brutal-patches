import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LfoComponent } from './lfo.component';

describe('LfoComponent', () => {
  let fixture: ComponentFixture<LfoComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LfoComponent] }).compileComponents();
    fixture = TestBed.createComponent(LfoComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
