import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatchInfoComponent } from './patch-info.component';

describe('PatchInfoComponent', () => {
  let component: PatchInfoComponent;
  let fixture: ComponentFixture<PatchInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PatchInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PatchInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
