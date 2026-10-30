import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatchInfoComponent } from './patch-info.component';

describe('PatchInfoComponent', () => {
  let fixture: ComponentFixture<PatchInfoComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PatchInfoComponent] }).compileComponents();
    fixture = TestBed.createComponent(PatchInfoComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
