import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyPatchListComponent } from './my-patch-list.component';

describe('MyPatchListComponent', () => {
  let component: MyPatchListComponent;
  let fixture: ComponentFixture<MyPatchListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MyPatchListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MyPatchListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
