import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToggleComponent } from './toggle.component';

describe('ToggleComponent', () => {
  let fixture: ComponentFixture<ToggleComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToggleComponent] }).compileComponents();
    fixture = TestBed.createComponent(ToggleComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
