jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    Logger: class MockLogger {
      log() {}
      debug() {}
      error() {}
      warn() {}
    },
  };
});

import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    service = new CacheService();
  });

  afterEach(() => {
    if (service) {
      const interval = (service as any).cleanupInterval;
      interval && clearInterval(interval);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set and get', () => {
    service.set('key', { value: 1 });
    expect(service.get('key')).toEqual({ value: 1 });
  });

  it('should return null for missing key', () => {
    expect(service.get('missing')).toBeNull();
  });
});
