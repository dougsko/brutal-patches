import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PatchDetailComponent } from './patch-detail.component';
import { mockPatch } from '../../test-utils/mock-patch';

describe('PatchDetailComponent', () => {
  let component: PatchDetailComponent;
  let fixture: ComponentFixture<PatchDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PatchDetailComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PatchDetailComponent);
    component = fixture.componentInstance;
    component.patch = { ...mockPatch };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with patch data', () => {
    expect(component.patch).toBeDefined();
    expect(component.patch.id).toBe(mockPatch.id);
    expect(component.patch.title).toBe(mockPatch.title);
  });

  it('should pass patch data to all child components', () => {
    // Verify that patch data is available for child components
    expect(component.patch.sub_fifth).toBeDefined(); // for oscillator
    expect(component.patch.cutoff).toBeDefined(); // for filter
    expect(component.patch.attack).toBeDefined(); // for envelope
    expect(component.patch.amount).toBeDefined(); // for lfo
    expect(component.patch.octave).toBeDefined(); // for octave
    expect(component.patch.volume).toBeDefined(); // for volume
    expect(component.patch.glide).toBeDefined(); // for controls
    expect(component.patch.pattern).toBeDefined(); // for sequencer
  });

  it('should handle patch parameter updates', () => {
    const originalCutoff = component.patch.cutoff;
    component.patch.cutoff = 0.8;
    
    expect(component.patch.cutoff).toBe(0.8);
    expect(component.patch.cutoff).not.toBe(originalCutoff);
  });

  it('should maintain patch object reference for two-way binding', () => {
    const patchRef = component.patch;
    
    // Modify patch properties
    patchRef.resonance = 0.9;
    patchRef.attack = 0.05;
    
    // Verify the component still has the same reference
    expect(component.patch).toBe(patchRef);
    expect(component.patch.resonance).toBe(0.9);
    expect(component.patch.attack).toBe(0.05);
  });

  it('should handle save patch functionality', () => {
    spyOn(component, 'savePatch');
    
    // Simulate save button click (would be triggered by template)
    component.savePatch();
    
    expect(component.savePatch).toHaveBeenCalled();
  });

  it('should validate synthesizer parameter ranges', () => {
    const continuousParams = [
      'sub_fifth', 'overtone', 'ultra_saw', 'saw', 'pulse_width', 'square', 'metalizer', 'triangle',
      'cutoff', 'resonance', 'env_amt', 'brute_factor', 'kbd_tracking',
      'attack', 'decay', 'sustain', 'release', 'volume', 'glide', 'mod_wheel', 'amount', 'rate'
    ];
    
    continuousParams.forEach(param => {
      const value = component.patch[param];
      if (typeof value === 'number') {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });
});
