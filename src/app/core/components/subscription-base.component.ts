import { Component, OnDestroy } from '@angular/core';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

/**
 * Base component providing subscription management utilities.
 * Implements the destroy$ pattern for automatic subscription cleanup.
 */
@Component({
  template: ''
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export abstract class SubscriptionBaseComponent implements OnDestroy {
  /**
   * Subject that emits when the component is destroyed.
   * Used with takeUntil() operator to automatically unsubscribe from observables.
   */
  protected readonly destroy$ = new Subject<void>();

  /**
   * Track if the component has been destroyed to prevent operations after destruction.
   */
  protected isDestroyed = false;

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Utility method to check if component is still active.
   * Can be used to prevent async operations after destruction.
   */
  protected isComponentActive(): boolean {
    return !this.isDestroyed;
  }
}