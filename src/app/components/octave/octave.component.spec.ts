import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OctaveComponent } from './octave.component';

describe('OctaveComponent', () => {
  let fixture: ComponentFixture<OctaveComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OctaveComponent] }).compileComponents();
    fixture = TestBed.createComponent(OctaveComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
