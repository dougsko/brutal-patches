/**
 * Visual Testing Utilities for Synthesizer Components
 * 
 * These utilities help ensure visual consistency during the upgrade
 * by providing standardized patch data and component testing helpers.
 */

import { mockPatch } from './mock-patch';
import { Patch } from '../interfaces/patch';

/**
 * Standard test patch configurations for visual consistency
 */
export const VisualTestPatches = {
  // Default patch with middle-range values
  default: mockPatch,

  // Minimum values patch for testing edge cases
  minimum: {
    ...mockPatch,
    sub_fifth: 0,
    overtone: 0,
    ultra_saw: 0,
    saw: 0,
    pulse_width: 0,
    square: 0,
    metalizer: 0,
    triangle: 0,
    cutoff: 0,
    resonance: 0,
    env_amt: 0,
    brute_factor: 0,
    kbd_tracking: 0,
    volume: 0,
    glide: 0,
    mod_wheel: 0,
    amount: 0,
    rate: 0,
    attack: 0,
    decay: 0,
    sustain: 0,
    release: 0
  } as Patch,

  // Maximum values patch for testing upper bounds
  maximum: {
    ...mockPatch,
    sub_fifth: 1,
    overtone: 1,
    ultra_saw: 1,
    saw: 1,
    pulse_width: 1,
    square: 1,
    metalizer: 1,
    triangle: 1,
    cutoff: 1,
    resonance: 1,
    env_amt: 1,
    brute_factor: 1,
    kbd_tracking: 1,
    volume: 1,
    glide: 1,
    mod_wheel: 1,
    amount: 1,
    rate: 1,
    attack: 1,
    decay: 1,
    sustain: 1,
    release: 1
  } as Patch,

  // Mixed values patch for comprehensive testing
  mixed: {
    ...mockPatch,
    sub_fifth: 0.25,
    ultra_saw: 0.75,
    saw: 0.5,
    square: 0.1,
    triangle: 0.9,
    cutoff: 0.6,
    resonance: 0.8,
    env_amt: 0.3,
    attack: 0.15,
    decay: 0.4,
    sustain: 0.85,
    release: 0.2,
    amount: 0.7,
    rate: 0.35
  } as Patch
};

/**
 * Visual test configuration for different component states
 */
export const VisualTestConfigs = {
  oscillator: {
    componentName: 'OscillatorComponent',
    criticalParams: ['sub_fifth', 'ultra_saw', 'saw', 'square', 'triangle', 'pulse_width', 'metalizer'],
    testPatches: [VisualTestPatches.default, VisualTestPatches.minimum, VisualTestPatches.maximum]
  },

  filter: {
    componentName: 'FilterComponent', 
    criticalParams: ['cutoff', 'resonance', 'env_amt', 'brute_factor', 'kbd_tracking', 'mode'],
    testPatches: [VisualTestPatches.default, VisualTestPatches.minimum, VisualTestPatches.maximum]
  },

  envelope: {
    componentName: 'EnvelopeComponent',
    criticalParams: ['attack', 'decay', 'sustain', 'release', 'env_amt', 'vca'], 
    testPatches: [VisualTestPatches.default, VisualTestPatches.minimum, VisualTestPatches.maximum]
  },

  lfo: {
    componentName: 'LfoComponent',
    criticalParams: ['amount', 'rate', 'wave', 'sync'],
    testPatches: [VisualTestPatches.default, VisualTestPatches.minimum, VisualTestPatches.maximum]
  },

  octave: {
    componentName: 'OctaveComponent',
    criticalParams: ['octave'],
    testPatches: [
      { ...VisualTestPatches.default, octave: -2 },
      { ...VisualTestPatches.default, octave: -1 }, 
      { ...VisualTestPatches.default, octave: 0 },
      { ...VisualTestPatches.default, octave: 1 },
      { ...VisualTestPatches.default, octave: 2 }
    ]
  },

  volume: {
    componentName: 'VolumeComponent', 
    criticalParams: ['volume'],
    testPatches: [VisualTestPatches.default, VisualTestPatches.minimum, VisualTestPatches.maximum]
  }
};

/**
 * Helper function to generate test descriptions for visual regression tests
 */
export function generateVisualTestDescription(componentName: string, patchType: string, paramValues: any): string {
  return `${componentName} should render correctly with ${patchType} patch values: ${JSON.stringify(paramValues)}`;
}

/**
 * Helper function to validate parameter ranges for visual testing
 */
export function validateParameterRanges(patch: Partial<Patch>, componentConfig: any): boolean {
  return componentConfig.criticalParams.every((param: string) => {
    const value = patch[param];
    if (typeof value === 'number') {
      return value >= 0 && value <= 1;
    }
    return true; // Non-numeric parameters pass validation
  });
}

/**
 * Visual regression test helper for component snapshots
 */
export class VisualTestHelper {
  static setupComponentForVisualTest(component: any, patch: Patch): void {
    component.patch = { ...patch };
    
    // Ensure component is in stable state for visual testing
    if (component.ngOnInit) {
      component.ngOnInit();
    }
  }

  static generateVisualTestCases(componentConfig: any): Array<{patch: Patch, description: string}> {
    const testCases: Array<{patch: Patch, description: string}> = [];
    
    componentConfig.testPatches.forEach((patch: Patch, index: number) => {
      const patchType = ['default', 'minimum', 'maximum', 'mixed'][index] || `patch${index}`;
      const description = generateVisualTestDescription(
        componentConfig.componentName, 
        patchType,
        componentConfig.criticalParams.reduce((acc: any, param: string) => {
          acc[param] = patch[param];
          return acc;
        }, {})
      );
      
      testCases.push({ patch, description });
    });

    return testCases;
  }
}

/**
 * Constants for visual regression testing
 */
export const VISUAL_TEST_CONSTANTS = {
  // Viewport sizes for responsive testing
  VIEWPORTS: {
    desktop: { width: 1920, height: 1080 },
    laptop: { width: 1366, height: 768 },
    tablet: { width: 1024, height: 768 }
  },

  // Color values for validation (approximate from UI analysis)
  COLORS: {
    orange: '#FF6600',
    background: '#000000', 
    text: '#FFFFFF',
    border: '#333333'
  },

  // Component dimensions for layout validation
  DIMENSIONS: {
    knobSize: 60, // pixels (approximate)
    sectionHeaderHeight: 30,
    componentSpacing: 20
  }
};