import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorBoundaryComponent } from './error-boundary.component';

describe('ErrorBoundaryComponent', () => {
  let fixture: ComponentFixture<ErrorBoundaryComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ErrorBoundaryComponent] }).compileComponents();
    fixture = TestBed.createComponent(ErrorBoundaryComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
