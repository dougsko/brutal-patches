import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProfileComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProfileComponent);
  });
  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
