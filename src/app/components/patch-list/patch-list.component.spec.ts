import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatchListComponent } from './patch-list.component';

describe('PatchListComponent', () => {
  let fixture: ComponentFixture<PatchListComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PatchListComponent] }).compileComponents();
    fixture = TestBed.createComponent(PatchListComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
