import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyPatchListComponent } from './my-patch-list.component';

describe('MyPatchListComponent', () => {
  let fixture: ComponentFixture<MyPatchListComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MyPatchListComponent] }).compileComponents();
    fixture = TestBed.createComponent(MyPatchListComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
