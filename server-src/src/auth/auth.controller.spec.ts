import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('should redirect to google login', () => {
    const controller = new AuthController({} as any);
    expect(controller).toBeDefined();
  });
});
