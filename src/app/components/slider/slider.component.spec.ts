import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SliderComponent } from './slider.component';

describe('SliderComponent', () => {
  let fixture: ComponentFixture<SliderComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SliderComponent] }).compileComponents();
    fixture = TestBed.createComponent(SliderComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
