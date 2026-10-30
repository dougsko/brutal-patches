import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatchDetailComponent } from './patch-detail.component';

describe('PatchDetailComponent', () => {
  let fixture: ComponentFixture<PatchDetailComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PatchDetailComponent] }).compileComponents();
    fixture = TestBed.createComponent(PatchDetailComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
