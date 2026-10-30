jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    Logger: class MockLogger { log(){} debug(){} error(){} warn(){} },
  };
});

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService({ sign: () => 'token', verify: () => ({}) } as any);
  });

  it('should create user profile from Google email', () => {
    expect(service.getProfile('a@b.com').email).toBe('a@b.com');
  });

  it('should sign a JWT cookie token', () => {
    expect(service.signToken({ email: 'a@b.com', username: 'a@b.com' })).toBe('token');
  });
});
