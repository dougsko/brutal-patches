import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionTimeoutWarningComponent } from './session-timeout-warning.component';

describe('SessionTimeoutWarningComponent', () => {
  let fixture: ComponentFixture<SessionTimeoutWarningComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SessionTimeoutWarningComponent] }).compileComponents();
    fixture = TestBed.createComponent(SessionTimeoutWarningComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
