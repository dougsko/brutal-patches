import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnvelopeComponent } from './envelope.component';

describe('EnvelopeComponent', () => {
  let fixture: ComponentFixture<EnvelopeComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EnvelopeComponent] }).compileComponents();
    fixture = TestBed.createComponent(EnvelopeComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
