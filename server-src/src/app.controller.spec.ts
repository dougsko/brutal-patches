import { AppController } from './app.controller';
describe('AppController', () => {
  let controller: AppController;
  beforeEach(() => {
    controller = new AppController({ getHello: () => 'Hello' } as any);
  });
  it('should be defined', () => expect(controller).toBeDefined());
});
