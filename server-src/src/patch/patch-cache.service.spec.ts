jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    Logger: class MockLogger { log(){} debug(){} error(){} warn(){} },
  };
});

import { PatchCacheService } from './patch-cache.service';

describe('PatchCacheService', () => {
  it('should be defined', () => {
    const service = new PatchCacheService({} as any, {} as any);
    expect(service).toBeDefined();
  });
});
