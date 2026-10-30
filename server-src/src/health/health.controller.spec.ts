import { HealthController } from './health.controller';
import { HealthService } from './health.service';

class MockLoggerService {
  log = () => {};
  error = () => {};
}

describe('HealthController', () => {
  let controller: HealthController;
  beforeEach(() => {
    controller = new HealthController(new HealthService(new MockLoggerService() as any) as any);
  });
  it('should be defined', () => expect(controller).toBeDefined());
});
