jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    Logger: class MockLogger { log(){} debug(){} error(){} warn(){} },
  };
});

import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  it('should be defined', () => {
    expect(new LoggerService()).toBeDefined();
  });
});
