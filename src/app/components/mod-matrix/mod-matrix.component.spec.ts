import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ModMatrixComponent } from './mod-matrix.component';
import { mockPatch } from '../../test-utils/mock-patch';

xdescribe('ModMatrixComponent', () => {
  let component: ModMatrixComponent;
  let fixture: ComponentFixture<ModMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModMatrixComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModMatrixComponent);
    component = fixture.componentInstance;
    component.patch = mockPatch;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
