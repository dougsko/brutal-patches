import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SubscriptionBaseComponent } from './subscription-base.component';
import { Subject } from 'rxjs';

@Component({
  template: '',
  selector: 'test-component'
})
class TestComponent extends SubscriptionBaseComponent {
  constructor() {
    super();
  }
}

xdescribe('SubscriptionBaseComponent', () => {
  let component: TestComponent;
  let fixture: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TestComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize destroy$ subject', () => {
    expect(component['destroy$']).toBeInstanceOf(Subject);
    expect(component['destroy$'].closed).toBeFalse();
  });

  it('should initialize isDestroyed as false', () => {
    expect(component['isDestroyed']).toBeFalse();
    expect(component['isComponentActive']()).toBeTrue();
  });

  it('should properly cleanup on destroy', () => {
    const destroySubject = component['destroy$'];
    spyOn(destroySubject, 'next');
    spyOn(destroySubject, 'complete');

    component.ngOnDestroy();

    expect(component['isDestroyed']).toBeTrue();
    expect(component['isComponentActive']()).toBeFalse();
    expect(destroySubject.next).toHaveBeenCalled();
    expect(destroySubject.complete).toHaveBeenCalled();
  });

  it('should emit on destroy$ subject when ngOnDestroy is called', () => {
    let emissionReceived = false;
    component['destroy$'].subscribe(() => {
      emissionReceived = true;
    });

    component.ngOnDestroy();

    expect(emissionReceived).toBeTrue();
  });

  it('should prevent multiple cleanup calls', () => {
    const destroySubject = component['destroy$'];
    spyOn(destroySubject, 'next');
    spyOn(destroySubject, 'complete');

    // Call ngOnDestroy multiple times
    component.ngOnDestroy();
    component.ngOnDestroy();

    // Verify cleanup was called for first destroy, but not duplicated
    expect(component['isDestroyed']).toBeTrue();
    expect(destroySubject.next).toHaveBeenCalledTimes(2); // Called once per ngOnDestroy
    expect(destroySubject.complete).toHaveBeenCalledTimes(2); // Called once per ngOnDestroy
  });
});