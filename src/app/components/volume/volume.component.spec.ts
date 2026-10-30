import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VolumeComponent } from './volume.component';

describe('VolumeComponent', () => {
  let fixture: ComponentFixture<VolumeComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VolumeComponent] }).compileComponents();
    fixture = TestBed.createComponent(VolumeComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
