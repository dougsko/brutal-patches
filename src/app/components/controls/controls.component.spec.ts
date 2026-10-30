import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlsComponent } from './controls.component';

describe('ControlsComponent', () => {
  let fixture: ComponentFixture<ControlsComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ControlsComponent] }).compileComponents();
    fixture = TestBed.createComponent(ControlsComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
