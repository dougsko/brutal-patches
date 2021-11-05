import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModMatrixComponent } from './mod-matrix.component';

describe('ModMatrixComponent', () => {
  let component: ModMatrixComponent;
  let fixture: ComponentFixture<ModMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModMatrixComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModMatrixComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
