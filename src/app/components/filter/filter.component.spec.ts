import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterComponent } from './filter.component';

describe('FilterComponent', () => {
  let fixture: ComponentFixture<FilterComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FilterComponent] }).compileComponents();
    fixture = TestBed.createComponent(FilterComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
