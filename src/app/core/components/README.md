# Subscription Management Components

## Overview

This directory contains base components that provide subscription management utilities to prevent memory leaks and manage reactive patterns consistently across the application.

## SubscriptionBaseComponent

The `SubscriptionBaseComponent` is an abstract base class that implements the destroy$ pattern for automatic subscription cleanup.

### Usage

```typescript
import { Component, OnInit } from '@angular/core';
import { SubscriptionBaseComponent } from '../../core/components';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html'
})
export class ExampleComponent extends SubscriptionBaseComponent implements OnInit {
  constructor(private exampleService: ExampleService) {
    super();
  }

  ngOnInit(): void {
    // Subscriptions automatically cleanup when component is destroyed
    this.exampleService.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        // Handle data
      });

    // Multiple subscriptions
    combineLatest([
      this.service1.getData(),
      this.service2.getData()
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([data1, data2]) => {
      // Handle combined data
    });
  }

  override ngOnDestroy(): void {
    // Always call super.ngOnDestroy() to trigger cleanup
    super.ngOnDestroy();
  }
}
```

### Key Features

1. **Automatic Cleanup**: The `destroy$` Subject automatically completes when the component is destroyed
2. **Memory Leak Prevention**: All subscriptions using `takeUntil(this.destroy$)` are automatically unsubscribed
3. **Component State Tracking**: Provides `isComponentActive()` method to check if component is still active
4. **Safe Operation Prevention**: Prevents operations after component destruction

### Best Practices

1. **Always use takeUntil**: Apply `takeUntil(this.destroy$)` to all subscriptions
2. **Check component state**: Use `isComponentActive()` before async operations
3. **Call super.ngOnDestroy()**: Always call the parent's ngOnDestroy method
4. **No manual unsubscription needed**: Let the destroy$ pattern handle cleanup automatically

### Anti-Patterns to Avoid

❌ **Don't do this:**
```typescript
// Manual subscription management (error-prone)
private subscription: Subscription;

ngOnInit() {
  this.subscription = this.service.getData().subscribe(data => {
    // Handle data
  });
}

ngOnDestroy() {
  if (this.subscription) {
    this.subscription.unsubscribe();
  }
}
```

✅ **Do this instead:**
```typescript
// Automatic subscription management
ngOnInit() {
  this.service.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      if (this.isComponentActive()) {
        // Handle data
      }
    });
}

override ngOnDestroy() {
  super.ngOnDestroy();
}
```

## Testing

When testing components that extend `SubscriptionBaseComponent`:

```typescript
it('should cleanup subscriptions on destroy', () => {
  // Initialize component
  component.ngOnInit();
  
  // Verify subscription cleanup
  component.ngOnDestroy();
  expect(component['isDestroyed']).toBeTrue();
  expect(component['isComponentActive']()).toBeFalse();
});
```

## Migration Guide

To migrate existing components:

1. Extend `SubscriptionBaseComponent` instead of implementing `OnDestroy`
2. Remove manual subscription tracking variables
3. Add `takeUntil(this.destroy$)` to all subscriptions
4. Replace manual unsubscribe logic with `super.ngOnDestroy()` call
5. Add component state checks for async operations

This pattern ensures consistent subscription management and prevents memory leaks across the entire application.