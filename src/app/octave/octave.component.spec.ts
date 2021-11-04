import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OctaveComponent } from './octave.component';

describe('OctaveComponent', () => {
  let component: OctaveComponent;
  let fixture: ComponentFixture<OctaveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OctaveComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OctaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
