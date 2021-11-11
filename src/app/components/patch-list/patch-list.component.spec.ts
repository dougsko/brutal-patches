import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatchListComponent } from './patch-list.component';


describe('PatchComponent', () => {
  let component: PatchListComponent;
  let fixture: ComponentFixture<PatchListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PatchListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PatchListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
