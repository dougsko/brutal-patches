import { EventData } from './event-data';

describe('EventData', () => {
  it('should create an instance', () => {
    expect(new EventData('test-event', 'test-value')).toBeTruthy();
  });

  it('should store name and value correctly', () => {
    const eventData = new EventData('test-event', 42);
    expect(eventData.name).toBe('test-event');
    expect(eventData.value).toBe(42);
  });
});
